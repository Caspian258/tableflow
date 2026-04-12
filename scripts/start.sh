#!/bin/sh
set -e

echo "[start] Ejecutando migraciones de base de datos..."
/app/server/node_modules/.bin/prisma migrate deploy --schema=/app/server/prisma/schema.prisma
echo "[start] Migraciones completadas."

exec node /app/server/dist/index.js
