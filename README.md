# DocBot

Assistant RAG pour PME : un administrateur alimente une base documentaire, un chatbot public répond **uniquement** à partir de ces documents et cite ses sources. S'il ne trouve pas l'information, il le dit au lieu d'inventer.

## Accès en ligne

| | Lien |
|---|---|
| 💬 **Chatbot (public)** | **[https://docbot-production-e721.up.railway.app](https://docbot-production-e721.up.railway.app)** |
| 🔐 Espace admin (documents, historique) | [https://docbot-production-e721.up.railway.app/admin](https://docbot-production-e721.up.railway.app/admin) |
| ❤️ État du service | [https://docbot-production-e721.up.railway.app/api/health](https://docbot-production-e721.up.railway.app/api/health) |

Le chatbot répond à partir des documents ajoutés dans l'espace admin : sans document, il indique qu'il ne trouve pas l'information.

Documents du projet : [SPEC.md](SPEC.md) (besoin reformulé, critères d'acceptation) · [CLAUDE.md](CLAUDE.md) (règles du projet) · [AI_WORKFLOW.md](AI_WORKFLOW.md) (journal du développement assisté par IA).

## Fonctionnalités

| Besoin | Où |
|---|---|
| Espace admin protégé (email / mot de passe, admin créé par seed) | `/admin/login` — session par cookie signé, `proxy.ts` + vérification serveur |
| Documents : ajout (texte collé, `.txt` / `.md`, ou `.pdf` dont le texte est extrait), liste, suppression, découpage en chunks stockés en base | `/admin/documents` |
| Chatbot public, réponses uniquement depuis les documents, sources citées | `/` et `POST /api/chat` |
| Refus explicite quand l'information n'existe pas | garde-fou sans appel au LLM + prompt strict |
| Historique des conversations consultable par l'admin | `/admin/conversations` |

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind CSS 4 · Prisma 7 · PostgreSQL 17 (recherche full-text + pgvector) · Transformers.js (embeddings locaux, `Xenova/multilingual-e5-small`) · Claude (SDK `@anthropic-ai/sdk`) derrière une interface `LLMProvider` · Vitest · Playwright · GitHub Actions · Docker · Railway

## Démarrage rapide

### Tout en Docker

```bash
cp .env.example .env   # puis renseigner SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
docker compose up --build
```

L'application est disponible sur http://localhost:3000. Au démarrage, le conteneur applique les migrations puis crée (ou met à jour) l'admin à partir de `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Espace admin : http://localhost:3000/admin.

Aucune clé API n'est nécessaire : par défaut le chatbot utilise le provider `mock`.

### Développement local

Prérequis : Node.js ≥ 24, et PostgreSQL 17 **avec l'extension [pgvector](https://github.com/pgvector/pgvector)** — soit via Docker (`docker compose up -d db` utilise l'image `pgvector/pgvector:pg17`), soit sur un PostgreSQL installé sur la machine (pgvector compilé et installé, voir la documentation de pgvector).

```bash
cp .env.example .env
npm install            # génère aussi le client Prisma
docker compose up -d db
npm run db:deploy      # applique les migrations
npx prisma db seed     # crée l'admin depuis ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev
```

## Fonctionnement

```
Visiteur ─► /  ─► POST /api/chat ─► limite 20 req/min/client
                                   ─► [dictionnaire d'abréviations : IDM → IDM (infarctus du myocarde)]
                                   ─► SEARCH_MODE=fulltext : recherche full-text PostgreSQL (top 5)
                                      SEARCH_MODE=hybrid   : full-text ∥ vectorielle (pgvector, seuil)
                                                             └─ fusion RRF (top 5)
                                        └─ aucun chunk ─► « Je ne trouve pas… » (LLM non appelé)
                                   ─► LLMProvider (mock | anthropic) : extraits numérotés, citations [n]
                                        └─ « non trouvé » ─► réponse sans source
                                   ─► conversation + messages + instantané des sources
Admin ───► proxy.ts (cookie) ─► requireAdmin() ─► documents (découpage) · conversations
```

1. **Indexation** : un document est découpé en chunks (~800 caractères, 1 200 max) par paragraphes et sections Markdown, avec un chevauchement de ~100 caractères ; chaque chunk d'une section commence par son titre. PostgreSQL calcule pour chaque chunk un `tsvector` (configuration `docbot_fr` : racinisation française, accents ignorés) dans une colonne générée, indexée en GIN.
2. **Recherche** : les mots de la question (hors mots vides) sont combinés en **OU** — une question en langage naturel a rarement tous ses mots dans un même passage — puis les chunks sont classés par `ts_rank_cd`. En mode `hybrid`, une recherche par embeddings tourne en parallèle et les deux classements sont fusionnés (voir [Où est le RAG](#où-est-le-rag)).
3. **Garde-fou** : si aucun chunk ne correspond, DocBot répond « Je ne trouve pas cette information dans la documentation. » **sans appeler le LLM**.
4. **Génération** : sinon, le LLM reçoit les extraits numérotés (balisés, traités comme des données) et doit répondre uniquement à partir d'eux en citant `[n]` ; s'ils ne suffisent pas, il renvoie la phrase de refus et aucune source n'est affichée.
5. **Historique** : chaque échange est enregistré avec un instantané des sources citées, lisible même après suppression du document.

## Où est le RAG

Le RAG se fait en trois temps : **indexer** les documents, **retrouver** les bons passages (*Retrieval*), **générer** la réponse à partir d'eux (*Generation*).

| Étape | Fichiers | Rôle |
|---|---|---|
| Indexation | [chunk.ts](src/lib/documents/chunk.ts), [service.ts](src/lib/documents/service.ts), migrations [chunk_fts](prisma/migrations/20261001100000_chunk_fts/migration.sql) et [chunk_embeddings](prisma/migrations/20261103100000_chunk_embeddings/migration.sql) | Découpage en chunks ; `tsvector` généré + index GIN ; en mode `hybrid`, embedding de chaque chunk (`vector(384)`, index HNSW cosinus), calculé avant l'écriture et stocké dans la même transaction |
| Recherche | [search.ts](src/lib/search/search.ts) (`searchChunks`, interface inchangée), [hybrid.ts](src/lib/search/hybrid.ts) (RRF, seuil), [semantic.ts](src/lib/search/semantic.ts) (pgvector), [abbreviations.ts](src/lib/search/abbreviations.ts) | Full-text seul, ou hybride : full-text et vectorielle en parallèle, résultats vectoriels sous le seuil écartés, fusion RRF, top 5 |
| Modèle d'embeddings | [local.ts](src/lib/embeddings/local.ts), [config.ts](src/lib/embeddings/config.ts), [embedder.ts](src/lib/embeddings/embedder.ts) | Transformers.js (ONNX Runtime, CPU), fichiers lus uniquement dans `.models/` (`allowRemoteModels = false`) |
| Garde-fou + génération | [answer.ts](src/lib/chat/answer.ts), [prompt.ts](src/lib/llm/prompt.ts), [src/lib/llm/](src/lib/llm/) | Aucun passage → refus **sans appeler le LLM** ; sinon extraits numérotés, citations `[n]`, phrase de refus exacte |

### Recherche hybride

- **Pourquoi** : la recherche full-text ne trouve que les mots présents dans le document. « pacemaker » ne trouve pas « stimulateur cardiaque », « enceinte » ne trouve pas « grossesse ». Les embeddings représentent le **sens** d'un texte par un vecteur : deux textes proches en sens ont des vecteurs proches, même sans mot commun. Les deux recherches se complètent : le full-text est précis sur les termes exacts, la recherche vectorielle comprend les reformulations.
- **Modèle** : `Xenova/multilingual-e5-small` — gratuit, open source, multilingue (français compris), 384 dimensions, 113 Mo en version quantifiée 8 bits. Il tourne dans Node avec Transformers.js, sans service à part ni clé API ; une fois téléchargé (`npm run model:download`), tout fonctionne **hors ligne**. Les modèles E5 exigent des préfixes : `query: ` pour la question, `passage: ` pour les chunks.
- **Stockage** : pgvector dans PostgreSQL (pas de base vectorielle séparée). Index **HNSW** (graphe de plus proches voisins), distance cosinus ; contrairement à IVFFlat, il fonctionne dès la table vide.
- **Fusion RRF** (*Reciprocal Rank Fusion*, Cormack et al. 2009) : chaque chunk reçoit `Σ 1 / (60 + rang)` sur les listes où il apparaît. Seuls les **rangs** comptent, ce qui évite de comparer des scores de natures différentes (`ts_rank_cd` et similarité cosinus) ; un chunk bien classé par les deux recherches passe devant.
- **Seuil** (`VECTOR_MIN_SIMILARITY`, défaut **0,853**) : les résultats vectoriels moins similaires sont écartés, pour qu'une question hors sujet donne toujours zéro passage côté vectoriel, donc un refus sans appel au LLM. Il a été **mesuré** (`npm run measure:similarity`) sur 17 questions de référence : les questions hors sujet proches du domaine hospitalier montent jusqu'à **0,850** (« Comment prendre un rendez-vous ? »), alors que certaines bonnes sections sont à 0,822. Aucun seuil ne sépare parfaitement les deux groupes ; il est placé **du côté de la sécurité** : refuser à tort plutôt que répondre hors sujet. Marge faible (≈ 0,003) : valeur propre à ce corpus, à re-mesurer sur d'autres documents.
- **Dictionnaire d'abréviations** (`MEDICAL_ABBREVIATIONS=true`) : 24 abréviations médicales courantes (IDM, IRM, TDM, AVC, DFG…). Avant les deux recherches, la forme longue est ajoutée à côté de l'abréviation (« IDM » → « IDM (infarctus du myocarde) »). Mots entiers en majuscules uniquement, pour ne jamais modifier un mot français (« ira »).
- **Retour arrière** : `SEARCH_MODE=fulltext` (défaut) rétablit instantanément l'ancienne recherche.

### Résultats (`npm run eval:search`)

Sur le protocole fictif [fixtures/demo/protocole-imagerie.md](fixtures/demo/protocole-imagerie.md) (10 sections, un sujet chacune) et les questions de [fixtures/demo/questions.ts](fixtures/demo/questions.ts). Critère : le **1er** résultat contient la phrase attendue ; hors sujet : **zéro** passage.

| | full-text | hybride | hybride + dictionnaire |
|---|---|---|---|
| **Total (17)** | 9 | 12 | **13** |
| Bonne section (8) | 2 | 5 | **6** |
| Refus corrects (9) | 7 | 7 | 7 |

- Gagnées par l'hybride : pacemaker → stimulateur cardiaque, femme enceinte / radio → grossesse, peur d'être enfermé → claustrophobie. Gagnée par le dictionnaire : IDM → infarctus du myocarde.
- Restent en échec : deux paraphrases dont la bonne section est sous le seuil (identitovigilance 0,822, radioprotection 0,850) ; deux questions hors sujet qui passent par le **full-text** (« carte bancaire » ↔ « carte du porteur », « propose » ↔ « test proposé ») : la recherche en OU retient un chunk dès qu'un mot correspond, et le seuil ne filtre que le côté vectoriel.

### Réponses extractives (`LLM_PROVIDER=extractive`)

Le provider `mock` choisit ses phrases par **mots communs** avec la question : il refuse donc les questions que la recherche hybride vient de résoudre grâce au sens (« IDM », « femme enceinte », « peur d'être enfermé » : 0 à 1 mot commun avec le bon passage). Le provider [`extractive`](src/lib/llm/extractive.ts) garde le même principe — **ne rien écrire qui ne soit dans la documentation** — mais choisit les phrases **par le sens**, avec le même modèle local, gratuit et hors ligne :

1. il découpe le **1er passage** retourné par la recherche en phrases, chacune notée avec le titre de sa section (« IRM et stimulateur cardiaque. Un dispositif… ») pour garder son contexte ;
2. il compare chaque phrase à la question (dictionnaire d'abréviations appliqué si activé) ;
3. il cite au plus **2 phrases** au-dessus de `EXTRACTIVE_MIN_SIMILARITY`, **remises dans l'ordre du document**, avec `[1]` ; sinon, phrase de refus exacte.

Le garde-fou ne change pas : aucun passage trouvé → refus **sans appeler** le provider.

**Pourquoi uniquement le 1er passage** (mesuré avec `npm run measure:extractive`) : en notant les phrases de **tous** les passages, le provider refaisait la recherche phrase par phrase, et moins bien que la fusion RRF. Pour « pacemaker avant une IRM », la recherche avait mis la bonne section en tête, mais la phrase la plus proche venait de la section Infarctus (« Une IRM cardiaque peut être programmée… », 0,883). Les deux groupes se chevauchaient (marge **−0,031**, aucun seuil possible). Limité au 1er passage, les citations justes vont de 0,851 à 0,916 et les mauvaises (mauvaise section ou hors sujet) plafonnent à 0,821 : marge **+0,030**, seuil **0,836** au milieu.

Résultat sur les 17 questions (recherche hybride + dictionnaire + `extractive`) : **6 réponses justes citées** (délais, pacemaker, IDM, reins, grossesse, claustrophobie), **11 refus**, **aucune mauvaise réponse**. Le provider refuse aussi les 4 cas où la recherche avait mis un mauvais passage en tête (deux paraphrases sous le seuil vectoriel, deux faux positifs du full-text). Limite : la citation reste partielle quand la section contient plus de 2 phrases utiles (pacemaker : la contre-indication formelle n'est pas citée).

Pour la démo : `npm run model:download` (une fois), puis dans `.env` `SEARCH_MODE="hybrid"`, `MEDICAL_ABBREVIATIONS="true"` et `LLM_PROVIDER="extractive"`, `npm run demo:load`, `npm run embeddings:backfill`, `npm run dev`.

### Providers LLM

| `LLM_PROVIDER` | Usage | Comportement |
|---|---|---|
| `mock` (défaut) | tests, CI, démo sans clé | Déterministe et hors ligne : répond avec les phrases des extraits qui couvrent les **mots** de la question, les cite, refuse sinon (ne voit pas les synonymes) |
| `extractive` | démo locale, gratuite | Cite les phrases du **1er passage** les plus proches **en sens** de la question (modèle d'embeddings local), refuse sous `EXTRACTIVE_MIN_SIMILARITY` — voir [Réponses extractives](#réponses-extractives-llm_providerextractive) |
| `anthropic` | production | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) par défaut, modifiable avec `ANTHROPIC_MODEL` ; erreur ou refus du modèle → message « service momentanément indisponible » |

Le code applicatif ne dépend que de l'interface [`LLMProvider`](src/lib/llm/provider.ts).

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `DATABASE_URL` | oui | Chaîne de connexion PostgreSQL |
| `SESSION_SECRET` | oui | Clé de signature des sessions admin (≥ 32 caractères) |
| `ADMIN_EMAIL` | oui | Email de l'admin créé par le seed |
| `ADMIN_PASSWORD` | oui | Mot de passe de l'admin (≥ 12 caractères) |
| `LLM_PROVIDER` | non | `mock` (défaut, aucune clé requise), `anthropic` (API Claude, payante) ou `extractive` (local, gratuit) |
| `EXTRACTIVE_MIN_SIMILARITY` | non | `extractive` : similarité minimale d'une phrase citée, entre 0 et 1 (défaut `0.836`, mesuré) |
| `ANTHROPIC_API_KEY` | si `anthropic` | Clé API Claude |
| `ANTHROPIC_MODEL` | non | Modèle Claude (défaut `claude-haiku-4-5-20251001`) |
| `SEARCH_MODE` | non | `fulltext` (défaut) ou `hybrid` (full-text + embeddings, fusion RRF) ; toute autre valeur est refusée au démarrage |
| `VECTOR_MIN_SIMILARITY` | non | Mode `hybrid` : similarité cosinus minimale d'un résultat vectoriel, entre 0 et 1 (défaut `0.853`, mesuré — voir [Où est le RAG](#où-est-le-rag)) |
| `MEDICAL_ABBREVIATIONS` | non | `true` : ajoute la forme longue des abréviations médicales à la question avant la recherche (défaut `false`) |
| `EMBEDDING_MODEL` | non | Modèle d'embeddings Hugging Face (défaut `Xenova/multilingual-e5-small`) |
| `EMBEDDING_MODEL_DIR` | non | Dossier local des fichiers du modèle (défaut `.models`) |
| `PORT` | Railway | Port d'écoute ; doit correspondre au port cible du domaine public (voir Dépannage) |

Générer un `SESSION_SECRET` :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Aucun secret n'est versionné : seul [.env.example](.env.example) est dans le dépôt ; la CI génère des secrets jetables à chaque exécution.

## Tests

| Commande | Contenu | Base |
|---|---|---|
| `npm test` | **Unitaires** (184) : découpage en chunks, validation des documents et PDF, extraction des termes de recherche, fusion RRF, seuil, dictionnaire d'abréviations, provider extractif, évaluation, citations, pipeline de réponse (faux search / faux LLM), providers, session, mots de passe, limiteur — avec un **faux modèle d'embeddings déterministe** (aucun téléchargement) | non |
| `npm run test:integration` | **Intégration** (24) : recherche full-text réelle, embeddings et recherche vectorielle sur **pgvector** (faux modèle), rattrapage des embeddings, réponse de bout en bout, persistance et historique — **vide les documents et conversations** | PostgreSQL + pgvector migré |
| `npm run test:search-quality` | **Qualité, vrai modèle** (34) : recherche (questions de référence, refus hors sujet, aucune régression full-text → hybride → dictionnaire) et chat complet avec le provider `extractive` (6 réponses citées, refus des mauvais passages, IDM en 2 phrases dans l'ordre). **Local uniquement** (pas en CI : il faut les fichiers du modèle) ; recharge le document de démo, ne touche à rien d'autre | base locale + `npm run model:download` |
| `npm run test:e2e` | **Playwright** (4) : authentification, gestion des documents, **parcours complet de SPEC §5** (ajout d'un document → réponse sourcée → refus sans source → conversation retrouvée dans l'historique), validation de l'API | build + base seedée, `LLM_PROVIDER=mock` |

Aucun test ne nécessite de clé API ni d'accès réseau externe.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run lint` | ESLint |
| `npm run typecheck` | Génération des types de routes + `tsc --noEmit` |
| `npm test` / `npm run test:integration` / `npm run test:e2e` | Tests (voir ci-dessus) |
| `npm run build` | Build de production |
| `npm run db:migrate` | Créer une migration (dev) |
| `npm run db:deploy` | Appliquer les migrations |
| `npm run model:download` | Télécharger le modèle d'embeddings dans `.models/` (une fois ; ensuite tout fonctionne hors ligne) |
| `npm run demo:load` | Charger le protocole d'imagerie fictif de démonstration ([fixtures/demo/protocole-imagerie.md](fixtures/demo/protocole-imagerie.md)) dans la base locale |
| `npm run embeddings:backfill` | Calculer les embeddings des morceaux qui n'en ont pas (documents ajoutés en mode `fulltext`) ; relançable sans risque |
| `npm run measure:similarity` | Mesurer, avec le vrai modèle, la similarité de chaque question de référence avec chaque section, et l'intervalle possible pour le seuil |
| `npm run measure:extractive` | Mesurer la similarité de la phrase que citerait le provider `extractive` pour chaque question, et l'intervalle possible pour son seuil |
| `npm run eval:search` | Poser les questions de référence ([fixtures/demo/questions.ts](fixtures/demo/questions.ts)) et comparer les modes de recherche |

## Structure

```
src/
  app/                    # pages et routes : / (chat), admin/*, api/chat, api/health
  lib/
    auth/                 # session (jose), mots de passe (bcrypt), règles de redirection
    documents/            # découpage (pur), validation des entrées (pure), service Prisma
    search/               # extraction des termes (pure), requête full-text
    llm/                  # interface LLMProvider, prompt, mock, anthropic, factory
    chat/                 # pipeline de réponse, citations, persistance, historique, limiteur
  proxy.ts                # contrôle optimiste des routes /admin
prisma/                   # schéma, migrations (dont chunk_fts), seed de l'admin
tests/unit · tests/integration · e2e/
```

## CI

[.github/workflows/ci.yml](.github/workflows/ci.yml), sur chaque PR et sur `main` :

- **checks** : PostgreSQL de service, migrations + contrôle de dérive schéma ↔ migrations, seed (deux fois, pour l'idempotence), lint, typecheck, tests unitaires, tests d'intégration, build, tests e2e Playwright ;
- **docker** : `docker compose up` sur une base vierge, attente de `/api/health`, vérification que `/admin` redirige vers la connexion.

Le développement s'est fait en 8 PR, chacune relue avant merge (revues publiées en commentaire des PR).

## Déploiement (Railway)

> **Prérequis pour tout déploiement : PostgreSQL avec l'extension pgvector.** Les migrations activent `vector` (recherche par embeddings) : sur une base qui ne la propose pas, `prisma migrate deploy` échoue et l'application ne démarre pas, même avec `SEARCH_MODE=fulltext`. Vérifier avant de déployer : `SELECT * FROM pg_available_extensions WHERE name = 'vector';` doit renvoyer une ligne. Sur Railway, utiliser un service PostgreSQL avec pgvector (et non l'image PostgreSQL standard).

Déploiement continu via l'intégration GitHub de Railway : chaque merge dans `main` déclenche un build de l'image à partir du [Dockerfile](Dockerfile) (configuration dans [railway.json](railway.json)).

1. Railway → **New Project** → **Deploy from GitHub repo** → `docbot`.
2. Ajouter un service **PostgreSQL** au projet.
3. Dans le service de l'app, variables :
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `SESSION_SECRET` = une valeur aléatoire (voir ci-dessus)
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` = identifiants de l'admin
   - `PORT` = `3000`
   - `LLM_PROVIDER` = `mock`, ou `anthropic` avec `ANTHROPIC_API_KEY`
4. **Settings → Networking → Generate Domain**, port cible `3000`.

Au démarrage, le conteneur applique les migrations (`prisma migrate deploy`), exécute le seed de l'admin (idempotent) puis lance Next.js ; Railway vérifie la santé via `GET /api/health`.

### Dépannage

Une erreur **502 « Application failed to respond »** a deux causes possibles :

| Symptôme | Cause | Correctif |
|---|---|---|
| Le déploiement est en échec ; les *Deploy Logs* montrent `Cannot seed admin: …` ou `Invalid environment: …` | Variable manquante ou invalide : le conteneur s'arrête au démarrage | Ajouter la variable (voir la liste ci-dessus) |
| Le déploiement est **réussi** (healthcheck interne OK) mais le domaine public renvoie 502 | Le domaine public cible un port différent de celui où écoute Next.js (Railway injecte sa propre valeur de `PORT`, par ex. 8080, alors que le domaine pointe vers 3000) | Définir `PORT=3000` sur le service, ou aligner le *Target port* du domaine (Settings → Networking) sur le port affiché dans les logs (`- Local: http://localhost:XXXX`) |

> Incident réel du premier déploiement : c'était le second cas, corrigé avec `PORT=3000` (détails dans [AI_WORKFLOW.md](AI_WORKFLOW.md)).

## Sécurité

- Mots de passe hachés avec bcrypt (coût 12) ; message d'erreur de connexion unique, et un calcul bcrypt effectué même pour un email inconnu (temps de réponse comparable).
- Session : JWT HS256 dans un cookie `httpOnly`, `sameSite=lax`, `secure` en production, 8 h ; chaque page et action admin revérifie la session et l'existence du compte.
- Server Actions protégées par la vérification d'origine de Next.js (CSRF).
- Entrées validées par zod côté serveur ; SQL brut uniquement via requêtes paramétrées ; la question est réduite à des lettres et chiffres avant la recherche.
- Extraits de documentation balisés dans le prompt et explicitement traités comme des données.
- Chat public limité à 20 requêtes par minute et par client.

## Limites connues (v1)

- Recherche : en mode `fulltext` (défaut), pas de synonymes ; le mode `hybrid` les comprend en partie, mais son seuil a une marge faible et a été mesuré sur un petit jeu (17 questions, 11 chunks) : à re-mesurer sur un vrai corpus (centaines de questions annotées, précision / rappel). Le full-text en OU peut retenir un passage hors sujet sur un seul mot commun. Pistes : modèle plus grand (`multilingual-e5-base`), reranker, seuil de rang côté full-text.
- Changer de mode `fulltext` → `hybrid` demande de calculer les embeddings existants (`npm run embeddings:backfill`) ; en `hybrid`, un document ajouté est vectorisé à l'indexation (quelques ms par chunk sur CPU).
- `npm run test:e2e` laisse en base un document « Support Zorblax… » par exécution : à lancer sur une base de test, pas sur la base de démo. En local, les fichiers e2e lancés en parallèle peuvent dépasser le délai de connexion (bcrypt) ; `--workers=1` les fait passer.
- Chaque question est traitée seule : une relance du type « et le samedi ? » ne profite pas du contexte de la conversation.
- PDF : seul le texte est extrait (pas d'OCR : un PDF scanné est refusé) ; les tableaux et les colonnes peuvent être remis en ordre de lecture approximatif.
- Le limiteur de débit est en mémoire : valable pour une instance unique.
- Session non révocable avant expiration (8 h), sauf suppression du compte ; pas de limitation des tentatives de connexion.
- Les questions des visiteurs peuvent contenir des données personnelles ; aucune durée de conservation n'est définie.
- Avec le provider `anthropic`, le refus de répondre hors documentation repose sur le prompt (le garde-fou « aucun chunk » reste déterministe) ; avec `mock`, il est entièrement déterministe.
- Pas de streaming des réponses.
