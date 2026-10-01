# CLAUDE.md — DocBot

Assistant RAG pour PME : admin qui gère des documents, chatbot public qui répond uniquement à partir de ces documents en citant ses sources. Spécification : [SPEC.md](SPEC.md).

@AGENTS.md

> Next.js **16** et Prisma **7** : lire la doc embarquée (`node_modules/next/dist/docs/`) avant d'utiliser une API Next. Points déjà relevés : `middleware` → `proxy.ts` ; `cookies()`, `headers()`, `params`, `searchParams` sont **asynchrones** ; Prisma 7 = `prisma.config.ts` + client généré dans `src/generated/prisma` + driver adapter `@prisma/adapter-pg`.

## Stack

- Next.js (App Router, TypeScript strict, Server Actions + Route Handlers)
- Prisma + PostgreSQL 17 (Docker) — recherche full-text Postgres (`tsvector` + GIN), **pas d'embeddings**
- Tailwind CSS
- Validation : zod · Hash : bcryptjs · Session : cookie signé (jose)
- LLM : interface `LLMProvider` (`src/lib/llm/`), choisi par `LLM_PROVIDER=mock|anthropic` (défaut `mock`)
- Déploiement : Railway via intégration GitHub (auto-deploy sur merge dans `main`), image construite depuis le `Dockerfile`
- Tests : Vitest (unitaires + intégration DB), Playwright (e2e)
- Gestionnaire de paquets : **npm**

## Structure

```
src/
  app/                 # routes Next.js : / (chat), admin/*, api/* — composants à côté de leur page
  proxy.ts             # contrôle optimiste des routes /admin (ex-middleware)
  lib/
    auth/              # session, hash, garde admin
    documents/         # chunking (pur), service documents
    search/            # construction de requête FTS (pur) + requête SQL
    llm/               # provider.ts (interface), anthropic.ts, mock.ts, index.ts (factory)
    chat/              # pipeline question → recherche → LLM → persistance, historique, limiteur
    db.ts              # client Prisma singleton
prisma/                # schema.prisma, migrations, seed.ts
tests/
  unit/                # Vitest, sans DB
  integration/         # Vitest, base Postgres de test
e2e/                   # Playwright
```

## Commandes

```bash
docker compose up -d db          # base seule (dev)
docker compose up --build        # base + app
npm run dev                      # app en dev (http://localhost:3000)
npm run lint                     # ESLint
npm run typecheck                # next typegen + tsc --noEmit
npm test                         # Vitest unitaires
npm run test:integration         # Vitest contre Postgres (DATABASE_URL de test — vide documents et conversations)
npm run test:e2e                 # Playwright (LLM_PROVIDER=mock)
npm run build                    # build de prod
npm run db:migrate               # prisma migrate dev (nouvelle migration)
npm run db:deploy                # prisma migrate deploy
npx prisma db seed               # crée l'admin depuis ADMIN_EMAIL / ADMIN_PASSWORD
```

## Conventions

- Code, identifiants et commits en anglais ; UI et docs en français.
- Commits Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`, `ci:`).
- Logique métier dans `src/lib/` sous forme de fonctions testables ; les routes et composants restent minces.
- Fonctions pures séparées des effets (ex. `chunkText()` ne touche pas la DB).
- Toute entrée externe (formulaires, API, fichiers) est validée avec zod côté serveur.
- SQL brut uniquement via `prisma.$queryRaw` avec template tagué (jamais de concaténation de chaînes).
- Le code applicatif ne dépend que de l'interface `LLMProvider`, jamais d'un SDK directement.

## Règles

1. **Tests obligatoires** : toute logique nouvelle ou modifiée est accompagnée de tests ; `lint`, `typecheck`, `test` et `build` passent avant d'ouvrir une PR.
2. **Aucun secret dans le repo** : seuls des placeholders dans `.env.example` ; `.env*` (hors `.env.example`) est gitignoré. Ne jamais afficher ni committer une clé.
3. **Une branche par feature** (`feat/...`, `fix/...`, `chore/...`), PR vers `main`, CI verte avant merge. Jamais de commit direct sur `main` après l'initialisation.
4. **Le bot n'invente pas** : aucun chunk pertinent → refus sans appel LLM. Ne jamais affaiblir ce garde-fou.
5. Les tests, la CI et l'e2e utilisent `LLM_PROVIDER=mock` ; aucun test ne doit nécessiter de clé API ni de réseau.
6. Mettre à jour `README.md` / `.env.example` quand une commande ou une variable change.
7. **`AI_WORKFLOW.md` est complété à chaque PR** (ce que l'IA a fait, ce qui a été corrigé/décidé par l'humain).
8. **Avant chaque merge** : relire la PR comme un reviewer exigeant, lister les problèmes (bloquants / mineurs), corriger les bloquants.
9. Les identifiants admin viennent uniquement de `ADMIN_EMAIL` / `ADMIN_PASSWORD` (env) ; jamais en dur, y compris dans les tests (variables d'env de test).
