#!/bin/bash
# Духолов 4.1: перенос прода из Supabase Cloud (проект duholov, Ирландия) на свой сервер (Timeweb Cloud, Москва).
# Запускать на сервере под root:  bash /opt/duholov/migrate/cloud-to-server.sh
# Спросит пароль базы облачного проекта (Supabase → Project Settings → Database). Пароль нигде не сохраняется.
#
# Что делает:
#   1. Выгружает из облака: схему public (таблицы, функции, права), данные public/auth/storage, правила хранилища.
#   2. Пересоздаёт базу сервера с нуля (всё, что было на сервере, стирается!) и загружает выгрузку.
#   3. Переносит фотографии мест (корзина poi-photos) через публичные адреса облака.
#   4. Сверяет число строк в облаке и на сервере.
# Входы игроков переносятся вместе с auth: гости и привязанные сервисы продолжают работать (ключ сессии меняется
# при первом обращении к новому серверу — см. www/js/move.js и Cloud.client).
set -euo pipefail

REF=cthqhwjnhqomlhrlberb
HOST=aws-1-eu-west-1.pooler.supabase.com
CLOUD=https://$REF.supabase.co
BUCKET=poi-photos
cd /opt/duholov
# --from <папка>: загрузить уже сделанную выгрузку (без пароля и без обращения к облаку за данными)
FROM=""; [ "${1:-}" = "--from" ] && FROM="$2"
W=${FROM:-/opt/duholov/migrate/run-$(date -u +%Y%m%d-%H%M%S)}
mkdir -p "$W"
log() { echo "==> $*"; }

if [ -z "$FROM" ]; then
read -rsp "Пароль базы облачного проекта duholov: " PGPASSWORD; echo
export PGPASSWORD
CONN="-h $HOST -p 5432 -U postgres.$REF -d postgres"
PGD() { docker exec -e PGPASSWORD supabase-db pg_dump $CONN "$@"; }
CPSQL() { docker exec -e PGPASSWORD supabase-db psql $CONN -tAq "$@"; }

log "Проверка связи с облаком"
CPSQL -c "select 'облако: ' || version()"

log "Выгрузка"
PGD --schema-only --schema=public > "$W/schema.sql"
PGD --schema-only --schema=storage | grep -E '^CREATE POLICY .* ON "?storage"?\."?objects"?' > "$W/storage-policies.sql" || true
PGD --data-only --schema=public --schema=auth --schema=storage \
  --exclude-table='auth.schema_migrations' --exclude-table='storage.migrations' \
  --exclude-table='auth.audit_log_entries' --exclude-table='auth.flow_state' > "$W/data.sql"
CPSQL -c "select string_agg(format('%s.%s=%s', schemaname, relname, n), ' ' order by schemaname, relname) from (
  select schemaname, relname, (xpath('/row/c/text()', query_to_xml(format('select count(*) c from %I.%I', schemaname, relname), false, true, '')))[1]::text::int n
  from pg_stat_user_tables where schemaname in ('public','auth','storage') and relname not in ('schema_migrations','migrations','audit_log_entries','flow_state')) t" > "$W/cloud-counts.txt"
CPSQL -c "select name from storage.objects where bucket_id = '$BUCKET'" > "$W/files.txt"
ls -la "$W"; log "Строк в облаке: $(cat "$W/cloud-counts.txt")"; log "Файлов: $(grep -c . "$W/files.txt" || true)"
unset PGPASSWORD
fi

log "Пересоздание базы сервера"
docker compose down --remove-orphans
rm -rf volumes/db/data volumes/storage/*
docker compose up -d
for i in $(seq 1 60); do
  n=$(docker ps --filter health=healthy --format '{{.Names}}' | grep -cE 'supabase-(db|auth|storage|rest|envoy)')
  [ "$n" -ge 5 ] && break; sleep 5
done
sleep 10
LPSQL() { docker exec -i supabase-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

# данные: пустые таблицы пропускаем (служебные таблицы входа в облаке бывают новее — с другими колонками),
# непустые — только те, что есть на сервере; пропущенные непустые — в журнале
EXIST=$(LPSQL -tA -c "select schemaname||'.'||tablename from pg_tables where schemaname in ('auth','storage')")
keep_known() { awk -v list="$EXIST" 'BEGIN { n = split(list, a, "\n"); for (i = 1; i <= n; i++) ok[a[i]] = 1 }
  inb {
    if ($0 == "\\.") { inb = 0; if (started) print; else if (drop && rows) print "  пропущена " t " (строк: " rows ")" > "/dev/stderr"; next }
    rows++
    if (drop) next
    if (!started) { print hdr; started = 1 }
    print; next
  }
  /^COPY / { t = $2; gsub(/"/, "", t); inb = 1; started = 0; rows = 0; hdr = $0; drop = (t !~ /^public\./ && !(t in ok)); next }
  { print }'; }
log "Загрузка схемы"
# схема public на сервере уже есть — строки про саму схему из выгрузки пропускаем
grep -vE "^(CREATE SCHEMA public;|ALTER SCHEMA public OWNER TO|COMMENT ON SCHEMA public )" "$W/schema.sql" | LPSQL
log "Загрузка данных"
{ echo "SET session_replication_role = replica;"; keep_known < "$W/data.sql"; } | LPSQL
log "Правила хранилища"
[ -s "$W/storage-policies.sql" ] && LPSQL < "$W/storage-policies.sql" || echo "(нет)"
log "Миграции, которых ещё нет в облаке (018+)"
for f in /opt/duholov/migrate/sql/01[8-9]_*.sql /opt/duholov/migrate/sql/0[2-9][0-9]_*.sql; do [ -f "$f" ] && { echo "  $f"; LPSQL < "$f"; }; done
docker compose restart rest >/dev/null   # PostgREST перечитывает схему

log "Фотографии мест"
SRV=$(grep '^SERVICE_ROLE_KEY=' .env | cut -d= -f2-)
ok=0; bad=0
while IFS= read -r name; do
  [ -z "$name" ] && continue
  enc=$(jq -rn --arg s "$name" '$s|@uri' | sed 's/%2F/\//g')
  if curl -fsS "$CLOUD/storage/v1/object/public/$BUCKET/$enc" -o "$W/f.jpg" &&
     curl -fsS -X POST "http://127.0.0.1:8000/storage/v1/object/$BUCKET/$enc" -H "Authorization: Bearer $SRV" -H "apikey: $SRV" \
       -H 'x-upsert: true' -H 'Content-Type: image/jpeg' --data-binary @"$W/f.jpg" >/dev/null; then ok=$((ok+1)); else bad=$((bad+1)); echo "  не перенесён: $name"; fi
done < "$W/files.txt"
rm -f "$W/f.jpg"
log "Фото: перенесено $ok, ошибок $bad"

log "Сверка"
LPSQL -tA -c "select string_agg(format('%s.%s=%s', schemaname, relname, n), ' ' order by schemaname, relname) from (
  select schemaname, relname, (xpath('/row/c/text()', query_to_xml(format('select count(*) c from %I.%I', schemaname, relname), false, true, '')))[1]::text::int n
  from pg_stat_user_tables where schemaname in ('public','auth','storage') and relname not in ('schema_migrations','migrations','audit_log_entries','flow_state')) t" > "$W/server-counts.txt"
tr ' ' '\n' < "$W/cloud-counts.txt" | sort > "$W/a"; tr ' ' '\n' < "$W/server-counts.txt" | sort > "$W/b"
if diff "$W/a" "$W/b" > "$W/diff.txt"; then log "ВСЁ СОВПАДАЕТ"; else log "Расхождения (облако < > сервер):"; cat "$W/diff.txt"; fi
chmod -R go-rwx "$W"
log "Готово. Выгрузка: $W (удалить после проверки)"
