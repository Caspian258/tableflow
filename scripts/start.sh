#!/bin/sh
set -e

echo "[start] Ejecutando migraciones de base de datos..."
node_modules/.bin/prisma migrate deploy --schema=server/prisma/schema.prisma

echo "[start] Iniciando servidor..."
exec node server/dist/index.js
