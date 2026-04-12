#!/bin/sh
set -e

echo "[start] Ejecutando migraciones de base de datos..."
cd /app/server
node_modules/.bin/prisma migrate deploy
echo "[start] Migraciones completadas."

exec node dist/index.js
