# ─────────────────────────────────────────────────────────────────────────────
# TableFlow — server/Dockerfile
# Base: node:20-slim (Debian, sin Alpine — mejor compatibilidad de binarios)
# Build context: raíz del monorepo (Railway Root Directory = "server")
# pnpm se invoca vía npx para evitar instalación global (reduce uso de RAM)
# ─────────────────────────────────────────────────────────────────────────────

# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# Copiar manifests primero — esta capa se cachea mientras no cambien deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY server/package.json            server/
COPY packages/shared/package.json   packages/shared/
COPY apps/waiter/package.json       apps/waiter/
COPY apps/kitchen/package.json      apps/kitchen/
COPY apps/admin/package.json        apps/admin/

# npx descarga pnpm@9 y lo cachea en ~/.npm dentro de este stage
RUN npx --yes pnpm@9 install --frozen-lockfile

# Copiar fuentes y compilar
COPY packages/shared/ packages/shared/
COPY server/          server/

RUN npx pnpm@9 --filter server build
RUN npx pnpm@9 --filter server exec prisma generate

# ─── Stage 2: Producción ─────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

# Usuario sin privilegios (sintaxis Debian)
RUN groupadd --system --gid 1001 nodejs \
 && useradd  --system --uid 1001 --gid nodejs nodejs

COPY --from=builder /app/node_modules               ./node_modules
COPY --from=builder /app/server/dist                ./server/dist
COPY --from=builder /app/server/prisma              ./server/prisma
COPY --from=builder /app/node_modules/.prisma       ./node_modules/.prisma

COPY server/package.json ./server/package.json
COPY package.json        ./package.json
COPY scripts/start.sh    /start.sh
RUN chmod +x /start.sh

USER nodejs

ENV NODE_ENV=production \
    PORT=3001

EXPOSE 3001

# Node 20 tiene fetch nativo — no requiere wget ni curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["/start.sh"]
