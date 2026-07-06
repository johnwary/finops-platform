#!/usr/bin/env bash
# Daily Postgres backup: pg_dump (custom format) -> gzip -> S3, prune to last 30.
# Any failure exits non-zero with a clear stderr message (fail loud, no partial success).
set -euo pipefail

fail() { echo "backup.sh: $*" >&2; exit 1; }

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${S3_BUCKET:?S3_BUCKET is required (e.g. s3://my-bucket/finops)}"
RETENTION="${BACKUP_RETENTION:-30}"

# aws cli reads AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION from env.
# S3-compatible (non-AWS) endpoints pass through S3_ENDPOINT_URL.
ENDPOINT_ARG=""
[ -n "${S3_ENDPOINT_URL:-}" ] && ENDPOINT_ARG="--endpoint-url ${S3_ENDPOINT_URL}"

command -v pg_dump >/dev/null || fail "pg_dump not found on PATH"
command -v aws >/dev/null || fail "aws cli not found on PATH"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="finops-${STAMP}.dump.gz"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# pg_dump -Fc is already compressed, but gzip keeps the pipeline uniform and lets
# ops eyeball sizes; -Z0 avoids double-compressing.
pg_dump --format=custom --no-owner --no-privileges -Z0 "$DATABASE_URL" \
  | gzip -9 > "$TMP/$FILE" \
  || fail "pg_dump/gzip failed for $STAMP"

[ -s "$TMP/$FILE" ] || fail "dump is empty — refusing to upload $FILE"

# shellcheck disable=SC2086  # ENDPOINT_ARG is intentionally word-split (empty or one flag)
aws $ENDPOINT_ARG s3 cp "$TMP/$FILE" "${S3_BUCKET%/}/$FILE" \
  || fail "upload to ${S3_BUCKET%/}/$FILE failed"

echo "backup.sh: uploaded ${S3_BUCKET%/}/$FILE"

# Prune: keep newest $RETENTION objects, delete the rest. Names sort chronologically
# by the UTC timestamp, so lexical sort == time sort. sort -r + tail is portable
# (BSD head has no negative-count), dropping the newest $RETENTION lines.
# shellcheck disable=SC2086
OLD="$(aws $ENDPOINT_ARG s3 ls "${S3_BUCKET%/}/" \
  | awk '/finops-.*\.dump\.gz$/ {print $NF}' \
  | sort -r \
  | tail -n "+$((RETENTION + 1))")" || fail "listing bucket for prune failed"

for obj in $OLD; do
  # shellcheck disable=SC2086
  aws $ENDPOINT_ARG s3 rm "${S3_BUCKET%/}/$obj" \
    || fail "prune failed deleting $obj"
  echo "backup.sh: pruned $obj"
done

echo "backup.sh: done (retention ${RETENTION})"
