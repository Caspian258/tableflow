# ─────────────────────────────────────────────────────────────────────────────
# TableFlow — server/Dockerfile
# Base: node:20-slim (Debian)
# Build context: raíz del monorepo (Railway Root Directory = "server")
# ─────────────────────────────────────────────────────────────────────────────

# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# openssl es necesario para que Prisma genere el cliente correctamente
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY server/package.json            server/
COPY packages/shared/package.json   packages/shared/
COPY apps/waiter/package.json       apps/waiter/
COPY apps/kitchen/package.json      apps/kitchen/
COPY apps/admin/package.json        apps/admin/

RUN npx --yes pnpm@9 install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY server/          server/

RUN npx pnpm@9 --filter server build
RUN npx pnpm@9 --filter server exec prisma generate

# ─── Stage 2: Producción ─────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

# openssl en runtime también (Prisma lo necesita al conectar con la DB)
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules               ./node_modules
COPY --from=builder /app/server/node_modules        ./server/node_modules
COPY --from=builder /app/server/dist                ./server/dist
COPY --from=builder /app/server/prisma              ./server/prisma

COPY server/package.json ./server/package.json
COPY package.json        ./package.json
COPY scripts/start.sh    /start.sh
RUN chmod +x /start.sh

# Usa el usuario 'node' que ya viene incluido en node:20-slim
USER node

ENV NODE_ENV=production \
    PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["/start.sh"]
