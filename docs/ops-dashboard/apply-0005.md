# Apply migrations 0005 + 0006 (organizations, food logs) - run on the Mac

Two pending schema steps, both from 2026-07-01 sessions: push
`supabase/migrations/0005_organizations.sql` (org lanes) and
`supabase/migrations/0006_food_logs.sql` (universal-capture food logs) to the
production project `jnaycounllaafvorakss` (Taskify). The Windows machine's CLI
is authed to the LSG Supabase account, which cannot see this project; the Mac
can.

Both files are idempotent and additive only (new tables, two nullable columns,
triggers + realtime). Safe to run twice.

## Option A - Supabase CLI (from this repo)

```sh
git pull
npx supabase link --project-ref jnaycounllaafvorakss   # skip if this copy is already linked
npx supabase db push
```

`db push` applies every migration not yet on the remote (it will show 0005 and
0006). If it also lists 0001-0004, they are already applied server-side;
`npx supabase migration repair --status applied 0001 0002 0003 0004` first,
then push.

## Option B - SQL editor (no CLI needed)

Open https://supabase.com/dashboard/project/jnaycounllaafvorakss/sql/new and
run the full contents of `supabase/migrations/0005_organizations.sql`, then
`supabase/migrations/0006_food_logs.sql`.

## Verify (either option)

Run in the SQL editor:

```sql
select
  (select count(*) from information_schema.tables
     where table_name = 'organizations') as orgs_table,
  (select count(*) from information_schema.tables
     where table_name = 'food_logs') as food_logs_table,
  (select count(*) from information_schema.columns
     where table_name = 'tasks' and column_name = 'org_id') as tasks_org_id,
  (select count(*) from pg_publication_tables
     where pubname = 'supabase_realtime'
       and tablename in ('organizations', 'food_logs')) as realtime;
```

Expect `orgs_table`, `food_logs_table`, `tasks_org_id` all 1 and `realtime` 2.
Then open the deployed app signed in on any device: the boot setup creates the
"LS Global Group" org and files Blue Text + Power Dialer under it, and the
outbox drains the queued org + food rows. Create a task on one device and
watch it appear on the other with its lane color.

## Then: AI-path smoke test (prod)

With the migrations applied, open /notepad on the deployed app (signed in) and
dump: "call Bryan tomorrow about the RAG prompt, had 2 eggs and toast for
breakfast, did my morning workout". Expect a Blue Text task, a food log around
300-400 kcal visible on /food, and the morning workout routine checked.
