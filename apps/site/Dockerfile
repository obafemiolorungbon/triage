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
RUN pnpm exec nx run @triage/site:build

FROM docker.io/node:20-alpine AS runner

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

WORKDIR /usr/src/app

COPY --from=builder --chown=node:node /app/apps/site/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/site/.next/static ./apps/site/.next/static

USER node
EXPOSE 3001

CMD ["node", "apps/site/server.js"]
