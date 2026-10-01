# DocBot

Assistant RAG pour PME : un administrateur alimente une base documentaire, un chatbot public répond **uniquement** à partir de ces documents et cite ses sources. S'il ne trouve pas l'information, il le dit.

> 🚧 Projet en cours de construction — voir [SPEC.md](SPEC.md) pour le périmètre et [AI_WORKFLOW.md](AI_WORKFLOW.md) pour le journal de développement.

**Démo** : _URL Railway ajoutée après le premier déploiement._

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 7 · PostgreSQL 17 · Vitest · GitHub Actions · Docker · Railway

## Démarrage rapide

### Tout en Docker

```bash
docker compose up --build
```

L'application est disponible sur http://localhost:3000 (les migrations sont appliquées au démarrage).

### Développement local

Prérequis : Node.js ≥ 24, Docker.

```bash
cp .env.example .env
npm install            # génère aussi le client Prisma
docker compose up -d db
npm run db:deploy      # applique les migrations
npm run dev
```

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `DATABASE_URL` | oui | Chaîne de connexion PostgreSQL |
| `LLM_PROVIDER` | non | `mock` (défaut, aucune clé requise) ou `anthropic` |

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
4. **Settings → Networking → Generate Domain**.

Au démarrage, le conteneur applique les migrations (`prisma migrate deploy`) puis lance Next.js ; Railway vérifie la santé via `GET /api/health`.

## CI

[.github/workflows/ci.yml](.github/workflows/ci.yml), sur chaque PR et sur `main` :

- **checks** : migrations appliquées sur un Postgres de service + vérification schéma ↔ migrations, lint, typecheck, tests, build ;
- **docker** : build de l'image de production.
