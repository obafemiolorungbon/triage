FROM docker.io/node:20-alpine AS builder

WORKDIR /app

ENV CI=true
ENV NX_DAEMON=false
ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json tsconfig.json ./
COPY eslint.config.mjs ./
COPY apps ./apps
COPY libs ./libs

RUN pnpm install --frozen-lockfile
RUN pnpm exec nx run @triage/flux:build

FROM docker.io/node:20-alpine AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /usr/src/app

COPY --from=builder --chown=node:node /app/apps/flux/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/flux/public ./apps/flux/public
COPY --from=builder --chown=node:node /app/apps/flux/.next/static ./apps/flux/.next/static

USER node
EXPOSE 3000

CMD ["node", "apps/flux/server.js"]
