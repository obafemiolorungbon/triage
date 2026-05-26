FROM docker.io/node:20-alpine AS builder

WORKDIR /app

ENV CI=true
ENV NX_DAEMON=false
ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_WIDGET_ORIGIN=http://localhost:3000
ARG NEXT_PUBLIC_WIDGET_KEY=local-dev-widget
ENV NEXT_PUBLIC_WIDGET_ORIGIN=$NEXT_PUBLIC_WIDGET_ORIGIN
ENV NEXT_PUBLIC_WIDGET_KEY=$NEXT_PUBLIC_WIDGET_KEY

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json tsconfig.json ./
COPY eslint.config.mjs ./
COPY apps ./apps
COPY libs ./libs

RUN pnpm install --frozen-lockfile
RUN pnpm exec nx run @triage/playground:build

FROM docker.io/node:20-alpine AS runner

ENV NODE_ENV=production
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

WORKDIR /usr/src/app

COPY --from=builder --chown=node:node /app/apps/playground/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/playground/.next/static ./apps/playground/.next/static

USER node
EXPOSE 3002

CMD ["node", "apps/playground/server.js"]
