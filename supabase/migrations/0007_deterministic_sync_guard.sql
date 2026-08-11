-- Make exact sync metadata ties converge on the same record as the browser.

create or replace function sync_snake_to_camel(value text) returns text
language sql immutable strict as $$
  select string_agg(
    case
      when position = 1 then part
      else upper(left(part, 1)) || substring(part from 2)
    end,
    '' order by position
  )
  from unnest(string_to_array(value, '_')) with ordinality as pieces(part, position);
$$;

create or replace function sync_canonical_json(value jsonb) returns text
language plpgsql immutable strict as $$
declare
  result text;
begin
  case jsonb_typeof(value)
    when 'array' then
      select '[' || coalesce(string_agg(sync_canonical_json(item), ',' order by position), '') || ']'
      into result
      from jsonb_array_elements(value) with ordinality as items(item, position);
      return result;
    when 'object' then
      select '{' || coalesce(
        string_agg(to_jsonb(key)::text || ':' || sync_canonical_json(item), ',' order by key),
        ''
      ) || '}'
      into result
      from jsonb_each(value) as entries(key, item);
      return result;
    else
      return value::text;
  end case;
end;
$$;

create or replace function sync_local_record(value jsonb) returns jsonb
language sql immutable strict as $$
  select coalesce(jsonb_object_agg(sync_snake_to_camel(key), item), '{}'::jsonb)
  from jsonb_each(value) as entries(key, item)
  where key <> 'user_id' and item <> 'null'::jsonb;
$$;

create or replace function sync_guard() returns trigger
language plpgsql as $$
declare
  incoming_content text;
  stored_content text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.version < old.version
     or (new.version = old.version and new.updated_at < old.updated_at) then
    return old;
  end if;

  if new.version = old.version and new.updated_at = old.updated_at then
    if (new.deleted_at is null) <> (old.deleted_at is null) then
      return case when new.deleted_at is not null then new else old end;
    end if;

    if new.device_id <> old.device_id then
      return case when new.device_id > old.device_id then new else old end;
    end if;

    incoming_content := sync_canonical_json(sync_local_record(to_jsonb(new)));
    stored_content := sync_canonical_json(sync_local_record(to_jsonb(old)));
    return case when incoming_content > stored_content then new else old end;
  end if;

  return new;
end;
$$;
