#!/bin/sh
set -e

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
