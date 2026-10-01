# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# --- dependencies (postinstall runs `prisma generate`, so the schema is needed here)
FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# --- build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The generated client lives in src/generated (outside node_modules), so regenerate it here.
RUN npx prisma generate && npm run build

# --- runtime
# Keeps node_modules (incl. the Prisma CLI) so migrations run at startup.
# Trade-off: bigger image than `output: "standalone"`, but a single, simple start path.
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
# Local CLIs (prisma, next, tsx used by the seed) without going through npm.
ENV PATH=/app/node_modules/.bin:$PATH
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app ./
USER nextjs
EXPOSE 3000
# Apply migrations, seed the admin (idempotent, from ADMIN_EMAIL / ADMIN_PASSWORD),
# then `exec` so Next.js becomes PID 1 and receives SIGTERM directly.
CMD ["sh", "-c", "prisma migrate deploy && prisma db seed && exec next start"]
