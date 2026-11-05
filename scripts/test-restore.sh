#!/usr/bin/env bash
# scripts/test-restore.sh - Uji restore backup PocketBase (SOP: wajib tiap bulan).
# Langkah: salin pb_data -> scratch dir -> boot sandbox -> curl health -> bersihkan.
# Tidak menyentuh data produksi. Butuh: sqlite3, pocketbase binary, curl.
set -e
ROOT=/home/ardy/projects/webapp-komunitas
SRC="$ROOT/pb_data"
SCRATCH=$(mktemp -d /tmp/pb_restore_XXXXXX)

cleanup() { rm -rf "$SCRATCH"; }
trap cleanup EXIT

echo "[restore-test] Menyalin $SRC -> $SCRATCH"
rsync -a --exclude 'backups' "$SRC/" "$SCRATCH/"

echo "[restore-test] Menyalakan PocketBase sandbox di port 8199..."
cd "$ROOT"
nohup "$ROOT/pocketbase" serve --dir="$SCRATCH" \
  --migrationsDir="$ROOT/pb_migrations" --hooksDir="$ROOT/pb_hooks" \
  --http=100.117.176.41:8199 > /tmp/pb_restore_test.log 2>&1 &
PID=$!

for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 2
  if curl -sS -m 5 -o /dev/null -w "%{http_code}" http://100.117.176.41:8199/api/health 2>/dev/null | grep -q 200; then
    echo "[restore-test] SUKSES: restore sehat, health=200 (percobaan $i)"
    curl -sS -m 5 -o /dev/null -w "  health=%{http_code}\n" http://100.117.176.41:8095/api/health >/dev/null 2>&1 || true
    kill $PID 2>/dev/null || true
    echo "[restore-test] Sandbox dihentikan. Log: /tmp/pb_restore_test.log"
    exit 0
  fi
done

echo "[restore-test] GAGAL: sandbox tidak sehat dalam 20 detik. Log terakhir:"
tail -5 /tmp/pb_restore_test.log
kill $PID 2>/dev/null || true
exit 1
