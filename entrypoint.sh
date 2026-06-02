#!/bin/sh
set -e

echo "============================================"
echo "  blockmaps-SaaS — Starting..."
echo "============================================"

# ── Jalankan Prisma migrate deploy jika flag RUN_MIGRATIONS=true ──
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo ">> Running Prisma migrations..."
  npx prisma migrate deploy
  echo ">> Migrations completed."
fi

# ── Start Next.js server ──
echo ">> Starting Next.js server on port ${PORT:-3000}..."
exec node server.js
