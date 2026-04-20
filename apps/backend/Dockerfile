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
# Generate Prisma Client from within libs/db so the CLI resolves
# @prisma/client locally and skips the pnpm-workspace auto-add path
# (see prisma/prisma#26658, #5340, #18483).
# pnpm may place .prisma under libs/db (not repo-root node_modules); stage a fixed path for the runner COPY.
RUN cd libs/db && pnpm exec prisma generate --schema=prisma/schema.prisma && \
    PRISMA_GEN="$(find /app -type d -path '*/node_modules/.prisma' 2>/dev/null | head -n1)" && \
    if [ -z "$PRISMA_GEN" ] || [ ! -d "$PRISMA_GEN" ]; then \
      echo "prisma generate did not produce any node_modules/.prisma under /app"; \
      exit 1; \
    fi && \
    cp -r "$PRISMA_GEN" /app/docker-prisma-artifact
RUN pnpm exec nx run backend:build
RUN pnpm exec nx run backend:worker:build

FROM docker.io/node:20-alpine AS runner

ENV NODE_ENV=production
ENV PORT=4200

RUN addgroup --system backend && \
    adduser --system -G backend backend

WORKDIR /usr/src/app

COPY --from=builder /app/apps/backend/dist .
RUN node -e "const fs=require('fs');const p='./package.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));delete j.dependencies['@triage/db'];delete j.dependencies['@triage/shared-types'];fs.writeFileSync(p,JSON.stringify(j,null,2));"
RUN npm install --omit=dev
RUN npm install prisma@6 --omit=dev --no-package-lock

COPY --from=builder /app/docker-prisma-artifact ./node_modules/.prisma
COPY --from=builder /app/libs/db/prisma ./libs/db/prisma
COPY docker/backend-entry.sh /entry.sh
RUN chmod +x /entry.sh

RUN chown -R backend:backend /usr/src/app

USER backend
EXPOSE 4200

ENTRYPOINT ["/entry.sh"]
CMD ["api"]
