# Postgres backup & restore

Daily `pg_dump` to S3-compatible storage with 30-day retention, plus a guarded
restore for the quarterly drill. Referenced by `docs/guide/deploy-coolify.md`.

Both scripts need `pg_dump`/`pg_restore` (postgresql-client) and the `aws` CLI
on PATH — install both in whatever container runs the scheduled task.

## Environment variables

| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres URL. For backup: the DB to dump. For restore: the DB to overwrite. |
| `S3_BUCKET` | yes | Destination prefix, e.g. `s3://my-bucket/finops`. |
| `AWS_ACCESS_KEY_ID` | yes | Read by aws CLI. |
| `AWS_SECRET_ACCESS_KEY` | yes | Read by aws CLI. |
| `AWS_REGION` | yes* | Required by AWS S3; some S3-compatible providers ignore it. |
| `S3_ENDPOINT_URL` | no | Set for non-AWS S3 (MinIO, R2, Spaces, Backblaze). Omit for AWS. |
| `BACKUP_RETENTION` | no | Backups to keep. Default `30`. |
| `CONFIRM_RESTORE` | restore only | Must be `yes` or `restore.sh` refuses to run. |

## Backup — Coolify scheduled task

Coolify → the API (or Postgres) resource → **Scheduled Tasks** → add one:

- Frequency (cron): `0 3 * * *`  (daily 03:00 — set container TZ or accept UTC)
- Command:

```
/app/scripts/backup/backup.sh
```

Set `S3_BUCKET`, the `AWS_*` vars (and `S3_ENDPOINT_URL` if non-AWS) on that
resource. `DATABASE_URL` is already present on the API app. The task fails loud:
a non-zero exit surfaces in Coolify's task history and notifications.

## Restore drill (quarterly)

Restore the latest backup into a **scratch** database and open the app against
it — never restore over production during a drill.

```
DATABASE_URL='postgres://…@host:5432/finops_drill' \
S3_BUCKET='s3://my-bucket/finops' \
CONFIRM_RESTORE=yes \
./scripts/backup/restore.sh
```

Without `CONFIRM_RESTORE=yes` the script aborts before touching anything. It
downloads the newest `finops-*.dump.gz`, then `pg_restore --clean --if-exists`
into the target. Point `DATABASE_URL` at production only for a real recovery.
