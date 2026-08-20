# Build from the repo root as context: the workspace lockfile lives there.
FROM node:22-alpine AS build
RUN apk add --no-cache openssl && corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/logo-policy/package.json packages/logo-policy/package.json
RUN pnpm install --frozen-lockfile --filter @finops/api...

COPY packages/logo-policy packages/logo-policy
COPY apps/api apps/api
RUN cd apps/api && npx prisma generate && pnpm build
# Self-contained production bundle (prod deps only, includes dist/ + prisma/)
RUN pnpm --filter @finops/api deploy --prod --legacy /prod/api

FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /prod/api .
RUN chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
# start = prisma migrate deploy && node dist/index.js
CMD ["npm", "run", "start"]
