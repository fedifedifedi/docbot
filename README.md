# DocBot

Assistant RAG pour PME : un administrateur alimente une base documentaire, un chatbot public répond **uniquement** à partir de ces documents et cite ses sources. S'il ne trouve pas l'information, il le dit au lieu d'inventer.

**Démo** : https://docbot-production-e721.up.railway.app — chat public sur `/`, espace admin sur `/admin`, santé sur `/api/health`.

Documents du projet : [SPEC.md](SPEC.md) (besoin reformulé, critères d'acceptation) · [CLAUDE.md](CLAUDE.md) (règles du projet) · [AI_WORKFLOW.md](AI_WORKFLOW.md) (journal du développement assisté par IA).

## Fonctionnalités

| Besoin | Où |
|---|---|
| Espace admin protégé (email / mot de passe, admin créé par seed) | `/admin/login` — session par cookie signé, `proxy.ts` + vérification serveur |
| Documents : ajout (texte collé ou `.txt` / `.md`), liste, suppression, découpage en chunks stockés en base | `/admin/documents` |
| Chatbot public, réponses uniquement depuis les documents, sources citées | `/` et `POST /api/chat` |
| Refus explicite quand l'information n'existe pas | garde-fou sans appel au LLM + prompt strict |
| Historique des conversations consultable par l'admin | `/admin/conversations` |

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind CSS 4 · Prisma 7 · PostgreSQL 17 (recherche full-text, pas d'embeddings) · Claude (SDK `@anthropic-ai/sdk`) derrière une interface `LLMProvider` · Vitest · Playwright · GitHub Actions · Docker · Railway

## Démarrage rapide

### Tout en Docker

```bash
cp .env.example .env   # puis renseigner SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
docker compose up --build
```

L'application est disponible sur http://localhost:3000. Au démarrage, le conteneur applique les migrations puis crée (ou met à jour) l'admin à partir de `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Espace admin : http://localhost:3000/admin.

Aucune clé API n'est nécessaire : par défaut le chatbot utilise le provider `mock`.

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

```
Visiteur ─► /  ─► POST /api/chat ─► limite 20 req/min/client
                                   ─► recherche full-text PostgreSQL (top 5 chunks)
                                        └─ aucun chunk ─► « Je ne trouve pas… » (LLM non appelé)
                                   ─► LLMProvider (mock | anthropic) : extraits numérotés, citations [n]
                                        └─ « non trouvé » ─► réponse sans source
                                   ─► conversation + messages + instantané des sources
Admin ───► proxy.ts (cookie) ─► requireAdmin() ─► documents (découpage) · conversations
```

1. **Indexation** : un document est découpé en chunks (~800 caractères, 1 200 max) par paragraphes et sections Markdown, avec un chevauchement de ~100 caractères ; chaque chunk d'une section commence par son titre. PostgreSQL calcule pour chaque chunk un `tsvector` (configuration `docbot_fr` : racinisation française, accents ignorés) dans une colonne générée, indexée en GIN.
2. **Recherche** : les mots de la question (hors mots vides) sont combinés en **OU** — une question en langage naturel a rarement tous ses mots dans un même passage — puis les chunks sont classés par `ts_rank_cd`.
3. **Garde-fou** : si aucun chunk ne correspond, DocBot répond « Je ne trouve pas cette information dans la documentation. » **sans appeler le LLM**.
4. **Génération** : sinon, le LLM reçoit les extraits numérotés (balisés, traités comme des données) et doit répondre uniquement à partir d'eux en citant `[n]` ; s'ils ne suffisent pas, il renvoie la phrase de refus et aucune source n'est affichée.
5. **Historique** : chaque échange est enregistré avec un instantané des sources citées, lisible même après suppression du document.

### Providers LLM

| `LLM_PROVIDER` | Usage | Comportement |
|---|---|---|
| `mock` (défaut) | tests, CI, démo sans clé | Déterministe et hors ligne : répond avec les phrases des extraits qui couvrent la question, les cite, refuse sinon |
| `anthropic` | production | Claude (`claude-opus-5-5` par défaut, `effort: low`), relance serveur sur un autre modèle en cas de refus, erreurs → message « service momentanément indisponible » |

Le code applicatif ne dépend que de l'interface [`LLMProvider`](src/lib/llm/provider.ts).

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
| `PORT` | Railway | Port d'écoute ; doit correspondre au port cible du domaine public (voir Dépannage) |

Générer un `SESSION_SECRET` :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Aucun secret n'est versionné : seul [.env.example](.env.example) est dans le dépôt ; la CI génère des secrets jetables à chaque exécution.

## Tests

| Commande | Contenu | Base |
|---|---|---|
| `npm test` | **Unitaires** (95) : découpage en chunks, validation des documents, extraction des termes de recherche, citations, pipeline de réponse (faux search / faux LLM), provider mock, provider Anthropic via un `fetch` factice, session, mots de passe, limiteur | non |
| `npm run test:integration` | **Intégration** (15) : recherche full-text réelle (OU, racinisation, accents, classement, mots vides, opérateurs tsquery, cascade), persistance et historique des conversations — **vide les documents et conversations** | PostgreSQL migré |
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

Le développement s'est fait en 7 PR, chacune relue avant merge (revues publiées en commentaire des PR).

## Déploiement (Railway)

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

- Recherche lexicale : pas de synonymes ni de compréhension sémantique (« tarif » ne trouve pas « prix ») — c'est la contrainte de la v1 ; des embeddings (pgvector) seraient l'étape suivante, derrière la même fonction de recherche.
- Chaque question est traitée seule : une relance du type « et le samedi ? » ne profite pas du contexte de la conversation.
- Le limiteur de débit est en mémoire : valable pour une instance unique.
- Session non révocable avant expiration (8 h), sauf suppression du compte ; pas de limitation des tentatives de connexion.
- Les questions des visiteurs peuvent contenir des données personnelles ; aucune durée de conservation n'est définie.
- Avec le provider `anthropic`, le refus de répondre hors documentation repose sur le prompt (le garde-fou « aucun chunk » reste déterministe) ; avec `mock`, il est entièrement déterministe.
- Pas de streaming des réponses.
