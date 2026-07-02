-- Food logs (AI-estimated meals/snacks from universal capture).
-- Mirrors 0005's table conventions and 0004's guard/publication wiring.

create table if not exists food_logs (
  id text primary key,
  user_id uuid not null default auth.uid(),
  date text not null,
  meal_type text not null,
  description text not null,
  items jsonb not null default '[]',
  total_calories integer not null default 0,
  total_protein integer,
  total_carbs integer,
  total_fat integer,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  device_id text not null,
  deleted_at timestamptz
);

alter table food_logs enable row level security;

drop policy if exists food_logs_owner on food_logs;
create policy food_logs_owner on food_logs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create index if not exists food_logs_user_updated on food_logs (user_id, updated_at);

-- Attach the 0004 version-guard trigger + register for realtime.
do $$
declare t text;
begin
  foreach t in array array['food_logs']
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
