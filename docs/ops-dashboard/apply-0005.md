# Apply migration 0005 (organizations) - run on the Mac with Supabase access

One pending step from the org-lanes build (2026-07-01): push
`supabase/migrations/0005_organizations.sql` to the production project
`jnaycounllaafvorakss` (Taskify). The Windows machine's CLI is authed to the
LSG Supabase account, which cannot see this project; the Mac can.

The SQL is idempotent and additive only (new table, two nullable columns,
trigger + realtime). Safe to run twice.

## Option A - Supabase CLI (from this repo)

```sh
git pull
npx supabase link --project-ref jnaycounllaafvorakss   # skip if this copy is already linked
npx supabase db push
```

`db push` applies every migration not yet on the remote (it will show 0005
only). If it also lists 0001-0004, they are already applied server-side;
`npx supabase migration repair --status applied 0001 0002 0003 0004` first,
then push.

## Option B - SQL editor (no CLI needed)

Open https://supabase.com/dashboard/project/jnaycounllaafvorakss/sql/new
and run the full contents of `supabase/migrations/0005_organizations.sql`.

## Verify (either option)

Run in the SQL editor:

```sql
select
  (select count(*) from information_schema.tables
     where table_name = 'organizations') as orgs_table,
  (select count(*) from information_schema.columns
     where table_name = 'tasks' and column_name = 'org_id') as tasks_org_id,
  (select count(*) from pg_publication_tables
     where pubname = 'supabase_realtime' and tablename = 'organizations') as realtime;
```

All three should be 1. Then open the deployed app signed in on any device:
the boot setup creates the "LS Global Group" org and files Blue Text +
Power Dialer under it, and the outbox drains the queued org rows. Create a
task on one device and watch it appear on the other with its lane color.
