-- Ops Dashboard schema (v2). Mirrors the new @drift/core entities.
-- Applied at host time (`supabase db push`); not required for local Dexie dev.
-- RLS uses (select auth.uid()) = user_id per current Supabase perf guidance.

-- 1. Extend existing tables ---------------------------------------------------
alter table tasks add column if not exists domain_id text;
alter table tasks add column if not exists content_id text;
alter table tasks add column if not exists starred boolean not null default false;

alter table projects add column if not exists kind text not null default 'project';
alter table projects add column if not exists status text not null default 'active';
alter table projects add column if not exists domain_id text;
alter table projects add column if not exists description text;
alter table projects add column if not exists start_date date;
alter table projects add column if not exists due_date date;
alter table projects add column if not exists last_worked_at timestamptz;
alter table projects add column if not exists milestones jsonb not null default '[]'::jsonb;
alter table projects add column if not exists checklists jsonb not null default '[]'::jsonb;
alter table projects add column if not exists retainer_reset_day smallint;

-- 2. New tables ---------------------------------------------------------------
create table if not exists domains (
  id text primary key,
  user_id uuid not null default auth.uid(),
  name text not null,
  color text not null,
  icon text,
  description text,
  "order" integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  device_id text not null,
  deleted_at timestamptz
);

create table if not exists routines (
  id text primary key,
  user_id uuid not null default auth.uid(),
  name text not null,
  description text,
  time_of_day text not null default 'anytime',
  specific_time text,
  notify boolean not null default false,
  domain_id text,
  kind text not null default 'ongoing',
  duration_days integer,
  start_date date not null,
  end_date date,
  color text,
  "order" integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  device_id text not null,
  deleted_at timestamptz
);

create table if not exists routine_checks (
  id text primary key,
  user_id uuid not null default auth.uid(),
  routine_id text not null,
  date date not null,
  done boolean not null default false,
  completed_at timestamptz,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  device_id text not null,
  deleted_at timestamptz,
  unique (user_id, routine_id, date)
);

create table if not exists captures (
  id text primary key,
  user_id uuid not null default auth.uid(),
  raw text not null,
  source text not null default 'text',
  status text not null default 'pending',
  routed_to jsonb,
  ai_summary text,
  ai_kind text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  device_id text not null,
  deleted_at timestamptz
);

create table if not exists journal_entries (
  id text primary key,
  user_id uuid not null default auth.uid(),
  date date not null,
  title text,
  body text not null,
  media_urls text[] not null default '{}',
  mood text,
  tags text[] not null default '{}',
  source text,
  flagged_for_review boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  device_id text not null,
  deleted_at timestamptz
);

create table if not exists work_logs (
  id text primary key,
  user_id uuid not null default auth.uid(),
  project_id text not null,
  minutes integer not null,
  note text,
  at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  device_id text not null,
  deleted_at timestamptz
);

create table if not exists content (
  id text primary key,
  user_id uuid not null default auth.uid(),
  title text not null,
  type text not null default 'video',
  status text not null default 'idea',
  channel text,
  domain_id text,
  url text,
  outline text,
  publish_date date,
  checklist jsonb not null default '[]'::jsonb,
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  device_id text not null,
  deleted_at timestamptz
);

create table if not exists notifications (
  id text primary key,
  user_id uuid not null default auth.uid(),
  title text not null,
  body text,
  kind text not null default 'system',
  ref_type text,
  ref_id text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  device_id text not null,
  deleted_at timestamptz
);

create table if not exists checklist_templates (
  id text primary key,
  user_id uuid not null default auth.uid(),
  name text not null,
  kind text,
  items text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  device_id text not null,
  deleted_at timestamptz
);

-- 3. Indexes ------------------------------------------------------------------
create index if not exists domains_user_updated_idx on domains (user_id, updated_at);
create index if not exists routines_user_updated_idx on routines (user_id, updated_at);
create index if not exists routine_checks_user_idx on routine_checks (user_id, routine_id, date);
create index if not exists captures_user_status_idx on captures (user_id, status, created_at);
create index if not exists journal_user_date_idx on journal_entries (user_id, date);
create index if not exists work_logs_user_project_idx on work_logs (user_id, project_id, at);
create index if not exists content_user_updated_idx on content (user_id, updated_at);
create index if not exists notifications_user_idx on notifications (user_id, created_at);
create index if not exists checklist_templates_user_idx on checklist_templates (user_id, updated_at);

-- 4. RLS ----------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'domains','routines','routine_checks','captures','journal_entries',
    'work_logs','content','notifications','checklist_templates'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || '_owner', t
    );
  end loop;
end $$;
