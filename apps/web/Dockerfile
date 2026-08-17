# Build from the repo root as context: the workspace lockfile lives there.
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo

# Vite inlines this at build time — set it as a build arg in Coolify.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter @finops/web...

COPY apps/web apps/web
RUN pnpm --filter @finops/web build

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/healthz || exit 1
