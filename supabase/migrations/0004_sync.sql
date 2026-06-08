-- Ops Dashboard schema (v5). Turns the realtime sync engine on:
--   1. user_id defaults + correct RLS on the original (0001) tables.
--   2. A version-guard trigger that enforces pickWinner semantics server-side
--      (a slow device can never clobber a newer remote row, from any client).
--   3. Adds every synced table to the `supabase_realtime` publication so
--      postgres_changes streams inserts/updates to all devices.
-- Applied at host time via `supabase db push`.

-- 1) Original tables: default user_id to the caller and tighten RLS to match the
--    later migrations (TO authenticated + (select auth.uid()) for perf).
alter table tasks       alter column user_id set default auth.uid();
alter table projects    alter column user_id set default auth.uid();
alter table whiteboards alter column user_id set default auth.uid();

drop policy if exists tasks_owner on tasks;
drop policy if exists projects_owner on projects;
drop policy if exists whiteboards_owner on whiteboards;

create policy tasks_owner on tasks for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy projects_owner on projects for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy whiteboards_owner on whiteboards for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 2) Version-guard trigger. SECURITY INVOKER (default) — does not bypass RLS.
--    On UPDATE, if the incoming row is older than what's stored, keep the stored
--    row (RETURN OLD = no-op, so realtime does not echo a losing write).
create or replace function sync_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if (new.version < old.version)
       or (new.version = old.version and new.updated_at < old.updated_at) then
      return old;
    end if;
  end if;
  return new;
end;
$$;

-- 3) Attach the trigger + register the table for realtime, for every synced table.
do $$
declare t text;
begin
  foreach t in array array[
    'tasks','projects','whiteboards',
    'domains','routines','routine_checks','captures','journal_entries',
    'work_logs','content','notifications','checklist_templates',
    'people','notes','quotes','books'
  ]
  loop
    execute format('drop trigger if exists %I on %I', t || '_sync_guard', t);
    execute format(
      'create trigger %I before update on %I for each row execute function sync_guard()',
      t || '_sync_guard', t
    );
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception
      when duplicate_object then null;  -- already a publication member
    end;
  end loop;
end $$;
