#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is required for Prisma migrations and API database access." >&2
  exit 1
fi

# Run Prisma migrations
cd /app/apps/api
/app/apps/api/node_modules/.bin/prisma migrate deploy

# Start Express in background
node /app/apps/api/dist/index.js &

# Nginx on Alpine needs this dir for pid file
mkdir -p /run/nginx

# Verify nginx config before starting
nginx -t

# Start Nginx in foreground
exec nginx -g "daemon off;"
