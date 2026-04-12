# ─────────────────────────────────────────────────────────────────────────────
# TableFlow — server/Dockerfile (multi-stage, Node 20 Alpine)
# Build context: raíz del monorepo (Railway Root Directory = "server",
# pero el contexto de build sigue siendo el repo completo).
# ─────────────────────────────────────────────────────────────────────────────

# ─── Base: Node 20 + pnpm ────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN npm install -g pnpm@9

# ─── Stage 1: Instalar dependencias ──────────────────────────────────────────
# Copiamos solo los manifests para que esta capa se cachee mientras el código
# no cambie y solo cambien los fuentes.
FROM base AS deps
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY server/package.json            server/
COPY packages/shared/package.json   packages/shared/
COPY apps/waiter/package.json       apps/waiter/
COPY apps/kitchen/package.json      apps/kitchen/
COPY apps/admin/package.json        apps/admin/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: Compilar servidor y generar Prisma Client ──────────────────────
FROM deps AS builder
WORKDIR /app

# Solo los fuentes que necesita el servidor (compartido + server)
COPY packages/shared/ packages/shared/
COPY server/          server/

# Compilar TypeScript → dist/
RUN pnpm --filter server build

# Generar Prisma Client para linux/x64 (Alpine)
RUN pnpm --filter server exec prisma generate

# ─── Stage 3: Imagen de producción ───────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Usuario sin privilegios para seguridad
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nodejs

# Dependencias de runtime
COPY --from=deps    /app/node_modules               ./node_modules
COPY --from=builder /app/server/dist                ./server/dist
COPY --from=builder /app/server/prisma              ./server/prisma
# Prisma Client generado (binario específico de la plataforma)
COPY --from=builder /app/node_modules/.prisma       ./node_modules/.prisma

# Manifests mínimos para que Node resuelva el paquete
COPY server/package.json ./server/package.json
COPY package.json        ./package.json

# Script de arranque: corre migraciones y luego inicia el servidor
COPY scripts/start.sh /start.sh
RUN chmod +x /start.sh

USER nodejs

ENV NODE_ENV=production \
    PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["/start.sh"]
