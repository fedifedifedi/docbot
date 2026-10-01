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

## Fonctionnement

1. **Indexation** : un document ajouté par l'admin est découpé en chunks (~800 caractères, par paragraphes et sections Markdown). PostgreSQL calcule pour chaque chunk un `tsvector` (racinisation française, accents ignorés), indexé en GIN.
2. **Recherche** : les mots de la question (hors mots vides) sont combinés en OU, les chunks classés par `ts_rank_cd` ; les 5 meilleurs sont retenus.
3. **Garde-fou** : si aucun chunk ne correspond, DocBot répond « Je ne trouve pas cette information dans la documentation. » **sans appeler le LLM**.
4. **Génération** : sinon, le LLM reçoit les extraits numérotés et doit répondre uniquement à partir d'eux, en citant `[n]` ; s'ils ne suffisent pas, il renvoie la phrase de refus (et aucune source n'est affichée).
5. **Historique** : chaque échange est enregistré avec un instantané des sources citées.

Le LLM est choisi par `LLM_PROVIDER` : `mock` (défaut, déterministe, sans clé : répond en citant les phrases pertinentes des extraits) ou `anthropic` (Claude). Le chat public est limité à 20 questions par minute et par client.

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `DATABASE_URL` | oui | Chaîne de connexion PostgreSQL |
| `SESSION_SECRET` | oui | Clé de signature des sessions admin (≥ 32 caractères) |
| `ADMIN_EMAIL` | oui | Email de l'admin créé par le seed |
| `ADMIN_PASSWORD` | oui | Mot de passe de l'admin (≥ 12 caractères) |
| `LLM_PROVIDER` | non | `mock` (défaut, aucune clé requise) ou `anthropic` |
| `ANTHROPIC_API_KEY` | si `anthropic` | Clé API Claude |
| `ANTHROPIC_MODEL` | non | Modèle Claude (défaut `claude-opus-5-5`) |

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
| `npm test` | Tests unitaires (Vitest, sans base) |
| `npm run test:integration` | Tests d'intégration contre PostgreSQL (`DATABASE_URL` migrée ; **vide les documents et conversations**) |
| `npm run test:e2e` | Tests Playwright (après `npm run build`, base migrée et seedée, `LLM_PROVIDER=mock`) |
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
