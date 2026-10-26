# Database

- `migrations/`: schema, RLS policies, functions and seed data, applied in filename order.
  They are applied to the Supabase project through the Supabase MCP (`apply_migration`), one file per migration.
  Never edit an applied migration: add a new file.
- `tests/`: RLS and workflow tests. `scripts/test-db.sh` loads `tests/stub/supabase_stub.sql`
  (a minimal imitation of Supabase's `auth`/`storage` schemas and API roles) into a throwaway Postgres,
  applies all migrations, then runs every `tests/*.sql`. CI runs it on each pull request.
- After a schema change, regenerate `src/types/db.ts` from the Supabase project.
