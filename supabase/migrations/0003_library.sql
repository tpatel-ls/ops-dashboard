-- Ops Dashboard schema (v4). People CRM + Library (notes, quotes, books).
-- Applied at host time; not required for local Dexie dev.

create table if not exists people (
  id text primary key,
  user_id uuid not null default auth.uid(),
  name text not null,
  relationship text,
  avatar_url text,
  facts jsonb not null default '[]'::jsonb,
  interactions jsonb not null default '[]'::jsonb,
  domain_id text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  device_id text not null,
  deleted_at timestamptz
);

create table if not exists notes (
  id text primary key,
  user_id uuid not null default auth.uid(),
  title text,
  body text not null,
  source text,
  tags text[] not null default '{}',
  flagged_for_review boolean,
  image_url text,
  book_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  device_id text not null,
  deleted_at timestamptz
);

create table if not exists quotes (
  id text primary key,
  user_id uuid not null default auth.uid(),
  text text not null,
  author text,
  source text,
  source_type text,
  book_id text,
  thoughts jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  favorite boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  device_id text not null,
  deleted_at timestamptz
);

create table if not exists books (
  id text primary key,
  user_id uuid not null default auth.uid(),
  title text not null,
  author text,
  cover_url text,
  status text not null default 'want',
  format text,
  started_at date,
  finished_at date,
  rating smallint,
  isbn text,
  summary text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  device_id text not null,
  deleted_at timestamptz
);

create index if not exists people_user_idx on people (user_id, updated_at);
create index if not exists notes_user_idx on notes (user_id, updated_at);
create index if not exists quotes_user_idx on quotes (user_id, updated_at);
create index if not exists books_user_idx on books (user_id, updated_at);

do $$
declare t text;
begin
  foreach t in array array['people','notes','quotes','books']
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || '_owner', t
    );
  end loop;
end $$;
