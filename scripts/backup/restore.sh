#!/usr/bin/env bash
# Restore the latest S3 backup into a target DATABASE_URL.
# DESTRUCTIVE: pg_restore --clean drops and recreates objects. Guarded by CONFIRM_RESTORE=yes.
# For the quarterly drill, point DATABASE_URL at a scratch DB, not production.
set -euo pipefail

fail() { echo "restore.sh: $*" >&2; exit 1; }

: "${DATABASE_URL:?DATABASE_URL is required (target to restore INTO)}"
: "${S3_BUCKET:?S3_BUCKET is required (e.g. s3://my-bucket/finops)}"

[ "${CONFIRM_RESTORE:-}" = "yes" ] || fail \
  "refusing to run. This OVERWRITES the database at DATABASE_URL.
  Set CONFIRM_RESTORE=yes to proceed. Target: ${DATABASE_URL%%\?*}"

ENDPOINT_ARG=""
[ -n "${S3_ENDPOINT_URL:-}" ] && ENDPOINT_ARG="--endpoint-url ${S3_ENDPOINT_URL}"

command -v pg_restore >/dev/null || fail "pg_restore not found on PATH"
command -v aws >/dev/null || fail "aws cli not found on PATH"

# Latest by name — UTC-stamped names sort lexically by time.
# shellcheck disable=SC2086
LATEST="$(aws $ENDPOINT_ARG s3 ls "${S3_BUCKET%/}/" \
  | awk '/finops-.*\.dump\.gz$/ {print $NF}' \
  | sort \
  | tail -n 1)" || fail "listing bucket failed"
[ -n "$LATEST" ] || fail "no backups found in ${S3_BUCKET%/}/"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "restore.sh: downloading $LATEST"
# shellcheck disable=SC2086
aws $ENDPOINT_ARG s3 cp "${S3_BUCKET%/}/$LATEST" "$TMP/$LATEST" \
  || fail "download of $LATEST failed"

echo "restore.sh: restoring into ${DATABASE_URL%%\?*}"
gunzip -c "$TMP/$LATEST" \
  | pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DATABASE_URL" \
  || fail "pg_restore failed"

echo "restore.sh: done — restored $LATEST"
