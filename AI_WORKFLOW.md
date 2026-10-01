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
