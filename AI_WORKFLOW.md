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

**Choix assumé**
- Image Docker non « standalone » : elle garde `node_modules` pour pouvoir lancer `prisma migrate deploy` au démarrage. Image plus lourde, mais un seul chemin de démarrage, identique en local (compose) et sur Railway.
