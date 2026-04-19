FROM docker.io/node:20-alpine AS builder

WORKDIR /app

ENV CI=true
ENV NX_DAEMON=false
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json tsconfig.json ./
COPY eslint.config.mjs ./
COPY apps ./apps
COPY libs ./libs

RUN pnpm install --frozen-lockfile
RUN pnpm exec prisma generate --schema=libs/db/prisma/schema.prisma
RUN pnpm exec nx run backend:build
RUN pnpm exec nx run backend:worker:build

FROM docker.io/node:20-alpine AS runner

ENV NODE_ENV=production

RUN addgroup --system backend && \
    adduser --system -G backend backend

WORKDIR /usr/src/app

COPY --from=builder /app/apps/backend/dist .
RUN node -e "const fs=require('fs');const p='./package.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));delete j.dependencies['@triage/db'];delete j.dependencies['@triage/shared-types'];fs.writeFileSync(p,JSON.stringify(j,null,2));"
RUN npm install --omit=dev
RUN npm install prisma@6 --omit=dev --no-package-lock

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/libs/db/prisma ./libs/db/prisma
COPY docker/backend-entry.sh /entry.sh
RUN chmod +x /entry.sh

RUN chown -R backend:backend /usr/src/app

USER backend
EXPOSE 3000

ENTRYPOINT ["/entry.sh"]
CMD ["api"]
