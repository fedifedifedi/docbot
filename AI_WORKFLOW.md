# AI_WORKFLOW — Utilisation de l'IA sur DocBot

Ce projet est développé avec **Claude Code** (modèle Claude Opus 5.5) comme assistant de développement, piloté par un humain qui valide chaque étape. Ce document trace, PR par PR, ce que l'IA a produit, ce que l'humain a décidé ou corrigé, et les vérifications effectuées.

## Méthode

1. **Cadrage avant code** : l'IA vérifie l'environnement, reformule le besoin ([SPEC.md](SPEC.md)), fixe les règles du projet ([CLAUDE.md](CLAUDE.md)) et propose une architecture + un découpage en PR. Rien n'est implémenté avant validation humaine.
2. **Une branche / une PR par feature**, CI verte obligatoire.
3. **Revue critique avant merge** : l'IA relit chaque PR comme un reviewer exigeant et liste les problèmes ; les bloquants sont corrigés avant merge.
4. **Garde-fous** : aucun secret dans le repo, tests obligatoires, provider LLM mock pour les tests et la CI.

## Journal

### Étape 0 — Cadrage (commit initial)

**IA**
- Vérification de l'environnement : Node 24, npm 11, git, gh (authentifié), Docker + Compose. Absents : pnpm (→ npm), Railway CLI (→ intégration GitHub). Git Bash inutilisable (erreur de fork) → commandes via PowerShell.
- Rédaction de SPEC.md (exigences F1–F6, parcours e2e de référence, hors périmètre, critères d'acceptation) et CLAUDE.md.
- Proposition d'architecture : pipeline chat recherche FTS → garde-fou « aucun chunk = refus sans LLM » → provider ; session par cookie signé plutôt qu'Auth.js (un seul admin) ; requête FTS en OU plutôt que `websearch_to_tsquery` (trop stricte pour des questions en langage naturel).

**Décisions humaines**
- Provider Claude, sélectionnable via `LLM_PROVIDER=mock|anthropic`, `mock` par défaut tant qu'il n'y a pas de clé.
- Branche `master` renommée en `main` ; identité git configurée.
- Railway via intégration GitHub, et **Dockerfile + premier déploiement avancés en PR 1** (version en ligne dès le début).
- Seed admin uniquement depuis `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- AI_WORKFLOW.md tenu à jour à chaque PR ; revue critique avant chaque merge.

### PR 1 — `chore/setup` : socle, CI, Docker, Railway

**IA**
- Génération du squelette avec `create-next-app` (dans un dossier temporaire, puis copie) → Next.js **16.3** et Tailwind 4. Le fichier `AGENTS.md` livré par Next 16 avertit de changements cassants : lecture de la doc embarquée (`node_modules/next/dist/docs/`) avant d'écrire du code, et notes reportées dans CLAUDE.md (`middleware` → `proxy`, API de requête asynchrones).
- Prisma **7** (nouvelle config `prisma.config.ts`, client généré dans `src/generated`, driver adapter `pg`) ; modèle de données complet (`users`, `documents`, `chunks`, `conversations`, `messages`) et migration initiale.
- Validation de l'environnement avec zod (`src/lib/env.ts`, lue paresseusement pour que le build ne dépende pas des variables runtime) + tests unitaires.
- Route `/api/health` (vérifie la base) pour le healthcheck Railway.
- Dockerfile multi-étapes, docker-compose (db + app), `railway.json`, CI GitHub Actions (migrations + contrôle de synchronisation schéma/migrations, lint, typecheck, test, build, build Docker).

**Problèmes rencontrés et contournements**
- Réseau local instable (clé Wi-Fi USB) : les gros téléchargements TLS échouaient (`ERR_SSL_CIPHER_OPERATION_FAILED`, `bad record MAC`) pour npm, curl et Docker. Contournement npm : script de téléchargement avec retries + vérification d'intégrité, injecté dans le cache npm. Docker : impossible de récupérer l'image Postgres localement → migration initiale générée hors ligne (`prisma migrate diff --from-empty`) et **validée par la CI** contre un vrai Postgres (application + contrôle de dérive).
- Conflit de peer dependency `vitest@5` / `@types/node@20` → passage à `@types/node@24` (cohérent avec Node 24 utilisé partout).
- `tsc --noEmit` seul échoue sur un checkout propre (types de routes Next générés) → script `typecheck` = `next typegen && tsc --noEmit`.

**Revue critique avant merge**
- CI rouge au premier passage (job Docker) : le client Prisma, généré dans `src/generated`, n'était pas recopié dans l'étape de build → `prisma generate` ajouté à l'étape `builder`. Bug attrapé par la CI, invisible en local.
- Bloquant : l'image était *construite* mais jamais *démarrée* en CI → ajout d'un smoke test `docker compose up` + attente de `/api/health` (vérifie migrations + démarrage + accès DB, en non-root).
- Bloquant : `npm` en PID 1 ne relaie pas SIGTERM (arrêts lents sur Railway) → `sh -c "migrate deploy && exec next start"`.
- Mineurs acceptés : URL vide en fallback dans `prisma.config.ts` (nécessaire pour `generate` au build) ; image lourde ; `Conversation.updatedAt` à rafraîchir explicitement à l'ajout d'un message (PR 4).

**Choix assumé (PR 1)**
- Image Docker non « standalone » : elle garde `node_modules` pour pouvoir lancer `prisma migrate deploy` au démarrage. Image plus lourde, mais un seul chemin de démarrage, identique en local (compose) et sur Railway.

### PR 2 — `feat/admin-auth` : authentification admin

**IA**
- Lecture préalable de la doc Next 16 embarquée : `middleware` est devenu `proxy.ts` (runtime Node), et le guide d'authentification recommande un contrôle *optimiste* dans le proxy (cookie seulement) + une vraie vérification côté serveur (Data Access Layer).
- Session : JWT HS256 signé avec `jose`, cookie `httpOnly` / `sameSite=lax` / `secure` en prod, 8 h. Logique pure (`session-token.ts`) séparée des cookies (`session.ts`, `server-only`).
- Défense en profondeur : `proxy.ts` redirige les visiteurs non connectés, **et** le layout du groupe `(protected)` appelle `requireAdmin()`.
- Mots de passe : bcrypt (coût 12) ; comparaison avec un hash factice si l'email est inconnu (pas d'énumération de comptes par mesure du temps) ; message d'erreur unique.
- Seed idempotent (`upsert`) lisant `ADMIN_EMAIL` / `ADMIN_PASSWORD` validés par zod (échec explicite si absents) ; exécuté au démarrage du conteneur.
- Aucun identifiant dans le repo : `docker-compose.yml` exige les variables (`${VAR:?}`), la CI génère des secrets jetables avec `openssl rand`.
- Tests unitaires : token (aller-retour, falsification, mauvais secret, expiration), hash, règles de redirection, validation des identifiants du seed, env.

**Bug trouvé par les tests**
- Un `ADMIN_EMAIL` entouré d'espaces était rejeté : la validation `z.email()` passait avant la normalisation → `trim().toLowerCase().pipe(z.email())`.

**Revue critique avant merge**
- Bloquant : le parcours de connexion n'avait jamais été exécuté (pas de Postgres local) → **test Playwright login/logout ajouté dès cette PR** (infra e2e avancée), exécuté en CI contre un build de prod, une base migrée et seedée.
- Bloquant : `requireAdmin()` faisait confiance au seul jeton → vérifie aussi que le compte existe encore.
- Bug trouvé par la CI (smoke Docker) : `prisma db seed` lance `tsx`, absent du `PATH` hors npm → `node_modules/.bin` ajouté au `PATH` de l'image.
- Bug trouvé par l'e2e : après un échec de connexion, React 19 réinitialise le formulaire et **vide le champ email** ; la seconde tentative n'était même pas soumise (`required`). Diagnostic fait en téléchargeant la trace Playwright de la CI. Correctif : l'action renvoie l'email, réinjecté en `defaultValue` ; l'e2e vérifie désormais ce comportement.
- Faux positif corrigé dans le test : Next.js rend son propre `role="alert"` (annonceur de route) → sélecteur filtré par texte.
- Mineurs acceptés : pas de limitation de tentatives de connexion (hors périmètre v1, bcrypt coût 12 ralentit le brute force) ; session JWT non révocable avant expiration (8 h) hors suppression du compte ; cookie `secure` en prod — Safari peut le refuser sur `http://localhost` en Docker local (Chrome/Firefox OK).
