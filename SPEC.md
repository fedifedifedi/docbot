# DocBot — Spécification

Assistant RAG (Retrieval-Augmented Generation) pour une PME : un admin alimente une base documentaire, le public interroge un chatbot qui répond **uniquement** à partir de ces documents et cite ses sources.

## 1. Acteurs

| Acteur | Accès | Capacités |
|---|---|---|
| **Admin** | `/admin/*`, protégé par email + mot de passe | Gérer les documents, consulter l'historique des conversations |
| **Visiteur** | `/` (chat public), sans compte | Poser des questions, lire les réponses et leurs sources |

Il n'y a qu'**un seul admin**, créé par le seed à partir de `ADMIN_EMAIL` / `ADMIN_PASSWORD` lus depuis l'environnement — **jamais de valeur en dur dans le code** ; le seed échoue explicitement si ces variables manquent. Pas d'inscription, pas de gestion multi-utilisateurs.

## 2. Exigences fonctionnelles

### F1 — Authentification admin
- Formulaire de connexion email / mot de passe ; mot de passe stocké haché (bcrypt).
- Session par cookie `httpOnly`, `secure` en prod, `sameSite=lax`, signée (secret `SESSION_SECRET`), expiration 8 h.
- Toute route `/admin/*` et toute API d'administration renvoie vers la connexion (ou 401) sans session valide.
- Déconnexion.
- Message d'erreur générique en cas d'échec (pas de distinction « email inconnu » / « mauvais mot de passe »).

### F2 — Gestion des documents
- **Ajout** par deux moyens :
  - texte collé (titre + contenu) ;
  - upload d'un fichier `.txt` ou `.md` (titre par défaut = nom du fichier). Taille max : 1 Mo. UTF-8.
- Refus explicite des autres extensions, des fichiers vides et des contenus vides.
- À l'ajout, le contenu est **découpé en chunks** stockés en base, avec leur position (index) dans le document.
- **Liste** : titre, source (collé / fichier), nombre de chunks, date d'ajout.
- **Suppression** : supprime le document et ses chunks (cascade). Les conversations passées restent lisibles (les sources y sont conservées sous forme de snapshot).
- (Optionnel si le temps le permet) consultation du détail d'un document et de ses chunks.

### F3 — Découpage (chunking)
- Découpage par paragraphes (lignes vides), en respectant les titres Markdown comme frontières naturelles.
- Taille cible ~800 caractères, maximum ~1 200 ; un paragraphe trop long est redécoupé par phrases, puis en dernier recours par longueur.
- Chevauchement léger (~100 caractères) entre chunks consécutifs pour ne pas couper une information.
- Normalisation : fins de ligne, espaces superflus ; aucun chunk vide.
- Fonction **pure et déterministe**, couverte par des tests unitaires.

### F4 — Recherche (v1 : full-text PostgreSQL)
- Pas d'embeddings. Colonne `tsvector` générée sur le contenu des chunks (configuration `french`, accents neutralisés via `unaccent`), indexée en GIN.
- La question est normalisée en mots-clés (stop-words retirés par Postgres), combinés en **OU** pour tolérer les questions en langage naturel, classés par `ts_rank_cd`.
- Retourne les **top-k** chunks (k = 5 par défaut) au-dessus d'un seuil minimal de pertinence.
- Couverte par des tests (construction de requête en unitaire ; classement réel contre une base Postgres de test).

### F5 — Chatbot public
- Interface de chat sur `/` : saisie de la question, affichage de la réponse et des **sources** (titre du document + extrait du chunk).
- La conversation est conservée côté serveur (une conversation = une suite de messages ; identifiant conservé côté client pour enchaîner les questions).
- Pipeline d'une question :
  1. recherche full-text → chunks pertinents ;
  2. **si aucun chunk pertinent → réponse « je ne trouve pas cette information dans la documentation » sans appeler le LLM** (garde-fou déterministe) ;
  3. sinon, appel du LLM avec un prompt système strict : répondre uniquement à partir des extraits numérotés fournis, citer `[n]`, et dire explicitement si les extraits ne contiennent pas la réponse ;
  4. les sources renvoyées sont les chunks effectivement cités par la réponse (à défaut, ceux fournis au LLM).
- Question et réponse (avec sources) sont enregistrées.
- Validation des entrées : question non vide, longueur max (ex. 1 000 caractères).

### F6 — Historique admin
- Liste des conversations (date, nombre de messages, première question), plus récentes d'abord.
- Détail d'une conversation : messages dans l'ordre, avec les sources de chaque réponse.

## 3. Fournisseur LLM

- Interface `LLMProvider` unique utilisée par le chat ; le choix se fait par variable d'environnement `LLM_PROVIDER=mock|anthropic`, **`mock` par défaut**.
- **Provider réel** : API Claude (Anthropic) — clé `ANTHROPIC_API_KEY` ; si `LLM_PROVIDER=anthropic` sans clé, erreur explicite au démarrage du provider.
- **Provider mock** : déterministe, sans réseau ni clé ; construit une réponse à partir des extraits fournis et les cite. Utilisé par les tests, la CI et l'e2e.
- Erreur du provider réel → message d'erreur propre côté utilisateur, pas de crash.

## 4. Exigences non fonctionnelles

| Domaine | Exigence |
|---|---|
| Stack | Next.js (App Router, TypeScript), Prisma, PostgreSQL (Docker), Tailwind CSS |
| Secrets | Aucun secret versionné ; `.env.example` documente toutes les variables |
| Lancement local | `docker compose up` démarre base + app (migrations et seed inclus) |
| Tests | Unitaires (chunking, recherche) + 1 test Playwright du parcours complet, avec le provider mock |
| CI | GitHub Actions : lint, typecheck, tests, build, e2e |
| Process | Une branche par feature, au moins 3 PR |
| Déploiement | Railway (app + PostgreSQL), intégration GitHub : déploiement automatique à chaque merge dans `main`, en ligne dès la première PR |
| Documentation | `README.md` complet, `AI_WORKFLOW.md` (usage de l'IA pendant le développement) |
| Sécurité | Hash bcrypt, cookies httpOnly, validation des entrées (zod), requêtes SQL paramétrées uniquement |

## 5. Parcours de référence (test e2e)

1. L'admin se connecte.
2. Il ajoute un document contenant une information précise (ex. « Les horaires du support sont de 9h à 18h du lundi au vendredi »).
3. Le document apparaît dans la liste avec ses chunks.
4. Un visiteur demande sur le chat public « Quels sont les horaires du support ? » → réponse contenant l'information + source citée.
5. Il demande une information absente (« Quel est le prix du forfait entreprise ? ») → le bot indique ne pas avoir l'information, sans source.
6. L'admin retrouve cette conversation dans l'historique, avec les deux échanges.

## 6. Hors périmètre (v1)

Embeddings / recherche vectorielle, PDF/DOCX, multi-admin et rôles, streaming des réponses, multilingue avancé, rate limiting élaboré, édition de document (supprimer + ré-ajouter suffit).

## 7. Critères d'acceptation

- [ ] `docker compose up` sur une machine vierge → app fonctionnelle avec admin seedé.
- [ ] Le parcours de la section 5 passe en e2e avec le provider mock.
- [ ] Une question hors documentation ne produit jamais de réponse inventée ni de source.
- [ ] CI verte sur `main` ; ≥ 3 PR mergées.
- [ ] App déployée sur Railway, URL dans le README.
