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
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app ./
USER nextjs
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
