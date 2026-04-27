-- Drift initial schema. Mirrors @drift/core types.
-- Lands in M6 alongside the sync worker.

create extension if not exists pgcrypto;

create table if not exists projects (
  id text primary key,
  user_id uuid not null,
  name text not null,
  color text not null,
  icon text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  device_id text not null,
  deleted_at timestamptz
);

create table if not exists tasks (
  id text primary key,
  user_id uuid not null,
  title text not null,
  notes text,
  status text not null,
  priority smallint not null default 0,
  scheduled_for date,
  due_at timestamptz,
  start_at timestamptz,
  end_at timestamptz,
  estimate_minutes integer,
  actual_minutes integer,
  tags text[] not null default '{}',
  project_id text references projects(id) on delete set null,
  parent_id text references tasks(id) on delete set null,
  "order" integer not null default 0,
  recurrence jsonb,
  reminders jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  version integer not null default 1,
  device_id text not null,
  deleted_at timestamptz
);

create table if not exists whiteboards (
  id text primary key,
  user_id uuid not null,
  name text not null,
  document jsonb not null,
  linked_task_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  device_id text not null,
  deleted_at timestamptz
);

create index if not exists tasks_user_updated_idx on tasks (user_id, updated_at);
create index if not exists projects_user_updated_idx on projects (user_id, updated_at);
create index if not exists whiteboards_user_updated_idx on whiteboards (user_id, updated_at);

alter table tasks enable row level security;
alter table projects enable row level security;
alter table whiteboards enable row level security;

create policy tasks_owner on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy projects_owner on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy whiteboards_owner on whiteboards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
