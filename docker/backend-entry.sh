#!/bin/sh
set -e
cd /usr/src/app
if [ "$1" = "worker" ]; then
  exec node worker.js
fi
# Prisma client is already generated in the builder stage and copied in.
# Only run migrations at boot; skip generate to avoid the pnpm/monorepo
# auto-install path (see prisma/prisma#26658).
npx prisma migrate deploy --schema=libs/db/prisma/schema.prisma
exec node main.js
