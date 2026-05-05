# ── Stage 1: install all deps ──────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile

# ── Stage 2: build API ─────────────────────────────────────────────────────
FROM deps AS api-build
WORKDIR /app

COPY apps/api/ apps/api/
RUN pnpm --filter api prisma:generate
RUN pnpm --filter api build

# ── Stage 3: build web ─────────────────────────────────────────────────────
FROM deps AS web-build
WORKDIR /app

COPY apps/web/ apps/web/
RUN pnpm --filter web build

# ── Stage 4: production image ──────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

RUN npm install -g pnpm && apk add --no-cache nginx

# API runtime deps only
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --prod --filter api

# API compiled output + Prisma generated client
COPY --from=api-build /app/apps/api/dist apps/api/dist
COPY --from=api-build /app/apps/api/src/generated apps/api/src/generated
COPY apps/api/prisma apps/api/prisma

# Web static build
COPY --from=web-build /app/apps/web/dist /usr/share/nginx/html

# Nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
