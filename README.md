# DocBot

Assistant RAG pour PME : un administrateur alimente une base documentaire, un chatbot public répond **uniquement** à partir de ces documents et cite ses sources. S'il ne trouve pas l'information, il le dit.

> 🚧 Projet en cours de construction — voir [SPEC.md](SPEC.md) pour le périmètre et [AI_WORKFLOW.md](AI_WORKFLOW.md) pour le journal de développement.

**Démo** : https://docbot-production-e721.up.railway.app (espace admin : `/admin`, santé : `/api/health`)

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 7 · PostgreSQL 17 · Vitest · GitHub Actions · Docker · Railway

## Démarrage rapide

### Tout en Docker

```bash
cp .env.example .env   # puis renseigner SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
docker compose up --build
```

L'application est disponible sur http://localhost:3000. Au démarrage, le conteneur applique les migrations puis crée (ou met à jour) l'admin à partir de `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Espace admin : http://localhost:3000/admin.

### Développement local

Prérequis : Node.js ≥ 24, Docker.

```bash
cp .env.example .env
npm install            # génère aussi le client Prisma
docker compose up -d db
npm run db:deploy      # applique les migrations
npx prisma db seed     # crée l'admin depuis ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev
```

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `DATABASE_URL` | oui | Chaîne de connexion PostgreSQL |
| `SESSION_SECRET` | oui | Clé de signature des sessions admin (≥ 32 caractères) |
| `ADMIN_EMAIL` | oui | Email de l'admin créé par le seed |
| `ADMIN_PASSWORD` | oui | Mot de passe de l'admin (≥ 12 caractères) |
| `LLM_PROVIDER` | non | `mock` (défaut, aucune clé requise) ou `anthropic` |

Générer un `SESSION_SECRET` :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Aucun secret n'est versionné : seul [.env.example](.env.example) est dans le dépôt.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run lint` | ESLint |
| `npm run typecheck` | Génération des types de routes + `tsc --noEmit` |
| `npm test` | Tests unitaires (Vitest) |
| `npm run build` | Build de production |
| `npm run db:migrate` | Créer une migration (dev) |
| `npm run db:deploy` | Appliquer les migrations |

## Déploiement (Railway)

Déploiement continu via l'intégration GitHub de Railway : chaque merge dans `main` déclenche un build de l'image à partir du [Dockerfile](Dockerfile) (configuration dans [railway.json](railway.json)).

1. Railway → **New Project** → **Deploy from GitHub repo** → `docbot`.
2. Ajouter un service **PostgreSQL** au projet.
3. Dans le service de l'app, variables :
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `LLM_PROVIDER` = `mock`
   - `SESSION_SECRET` = une valeur aléatoire (voir ci-dessus)
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` = identifiants de l'admin
   - `PORT` = `3000` (doit correspondre au port cible du domaine public, voir Dépannage)
4. **Settings → Networking → Generate Domain**, port cible `3000`.

Au démarrage, le conteneur applique les migrations (`prisma migrate deploy`), exécute le seed de l'admin (idempotent) puis lance Next.js ; Railway vérifie la santé via `GET /api/health`.

### Dépannage

Une erreur **502 « Application failed to respond »** a deux causes possibles :

| Symptôme | Cause | Correctif |
|---|---|---|
| Le déploiement est en échec ; les *Deploy Logs* montrent `Cannot seed admin: …` ou `Invalid environment: …` | Variable manquante ou invalide : le conteneur s'arrête au démarrage | Ajouter la variable (voir la liste ci-dessus) |
| Le déploiement est **réussi** (healthcheck interne OK) mais le domaine public renvoie 502 | Le domaine public cible un port différent de celui où écoute Next.js (Railway injecte sa propre valeur de `PORT`, par ex. 8080, alors que le domaine pointe vers 3000) | Définir `PORT=3000` sur le service, ou aligner le *Target port* du domaine (Settings → Networking) sur le port affiché dans les logs (`- Local: http://localhost:XXXX`) |

> Incident réel du premier déploiement : c'était le second cas, corrigé avec `PORT=3000`.

## CI

[.github/workflows/ci.yml](.github/workflows/ci.yml), sur chaque PR et sur `main` :

- **checks** : migrations appliquées sur un Postgres de service + vérification schéma ↔ migrations, lint, typecheck, tests, build ;
- **docker** : build de l'image de production.
