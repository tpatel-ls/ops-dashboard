-- Organizations (work lanes: the user works for multiple orgs; records
-- without an org are Personal) + org_id on projects/tasks.
-- Mirrors 0002's table conventions and 0004's guard/publication wiring.

create table if not exists organizations (
  id text primary key,
  user_id uuid not null default auth.uid(),
  name text not null,
  color text not null,
  "order" integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  device_id text not null,
  deleted_at timestamptz
);

alter table organizations enable row level security;

drop policy if exists organizations_owner on organizations;
create policy organizations_owner on organizations for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create index if not exists organizations_user_updated on organizations (user_id, updated_at);

-- Lane pointer on the work records. Absent (null) = Personal.
alter table projects add column if not exists org_id text;
alter table tasks add column if not exists org_id text;

-- Attach the 0004 version-guard trigger + register for realtime.
do $$
declare t text;
begin
  foreach t in array array['organizations']
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
