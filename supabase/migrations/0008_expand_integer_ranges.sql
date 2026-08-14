-- Keep synchronized numeric columns compatible with JavaScript values.
-- Ordering uses Date.now() so it already exceeds PostgreSQL's 32-bit integer
-- range. Versions and validated numeric fields can also grow beyond int4.

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'tasks', 'projects', 'whiteboards', 'domains', 'routines',
    'routine_checks', 'captures', 'journal_entries', 'work_logs', 'content',
    'notifications', 'checklist_templates', 'people', 'notes', 'quotes',
    'books', 'organizations', 'food_logs'
  ]
  loop
    execute format(
      'alter table %I alter column version type bigint using version::bigint',
      table_name
    );
  end loop;
end $$;

alter table tasks
  alter column estimate_minutes type bigint using estimate_minutes::bigint,
  alter column actual_minutes type bigint using actual_minutes::bigint,
  alter column "order" type bigint using "order"::bigint;

alter table domains alter column "order" type bigint using "order"::bigint;
alter table routines
  alter column duration_days type bigint using duration_days::bigint,
  alter column "order" type bigint using "order"::bigint;
alter table work_logs alter column minutes type bigint using minutes::bigint;
alter table content alter column "order" type bigint using "order"::bigint;
alter table organizations alter column "order" type bigint using "order"::bigint;

alter table food_logs
  alter column total_calories type bigint using total_calories::bigint,
  alter column total_protein type bigint using total_protein::bigint,
  alter column total_carbs type bigint using total_carbs::bigint,
  alter column total_fat type bigint using total_fat::bigint;
