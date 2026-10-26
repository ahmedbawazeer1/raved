#!/usr/bin/env bash
# Runs database migrations + RLS tests against a throwaway Postgres.
# Needs DATABASE_URL pointing to an EMPTY database (CI service container or local cluster).
set -euo pipefail
cd "$(dirname "$0")/.."

: "${DATABASE_URL:?Set DATABASE_URL to an empty test database}"
PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -X)

"${PSQL[@]}" -f supabase/tests/stub/supabase_stub.sql
for f in supabase/migrations/*.sql; do
  echo "→ migration $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
"${PSQL[@]}" -f supabase/tests/helpers.sql
for f in supabase/tests/*.sql; do
  [[ "$(basename "$f")" == "helpers.sql" ]] && continue
  echo "→ test $(basename "$f")"
  "${PSQL[@]}" -o /dev/null -f "$f" 2>&1 | sed 's/^psql:[^:]*:[0-9]*: //'
done
