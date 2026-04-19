#!/bin/sh
set -e
cd /usr/src/app
if [ "$1" = "worker" ]; then
  exec node worker.js
fi
npx prisma generate --schema=libs/db/prisma/schema.prisma
npx prisma migrate deploy --schema=libs/db/prisma/schema.prisma
exec node main.js
