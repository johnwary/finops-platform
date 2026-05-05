#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is required for Prisma migrations and API database access." >&2
  exit 1
fi

# Run Prisma migrations before starting
node -e "
const { execSync } = require('child_process');
execSync('npx prisma migrate deploy', {
  cwd: '/app/apps/api',
  stdio: 'inherit',
  env: { ...process.env }
});
"

# Start Express in background
node /app/apps/api/dist/index.js &

# Start Nginx in foreground
nginx -g "daemon off;"
