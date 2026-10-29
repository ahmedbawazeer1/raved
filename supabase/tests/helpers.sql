-- Test helpers (local/CI only).
create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

create or replace function tests.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then
    raise exception 'FAILED: %', msg;
  end if;
  raise notice 'ok - %', msg;
end;
$$;

-- Asserts that running `sql` (as the current role) raises an error.
create or replace function tests.throws(sql text, msg text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    raise notice 'ok - % (%)', msg, sqlerrm;
    return;
  end;
  raise exception 'FAILED (no error): %', msg;
end;
$$;

-- Asserts that running `sql` raises an error whose message is exactly `expected`.
create or replace function tests.throws_msg(sql text, expected text, msg text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    if sqlerrm <> expected then
      raise exception 'FAILED (wrong error "%", expected "%"): %', sqlerrm, expected, msg;
    end if;
    raise notice 'ok - %', msg;
    return;
  end;
  raise exception 'FAILED (no error): %', msg;
end;
$$;

-- Number of rows `sql` returns (or changes, with RETURNING) for the current role.
create or replace function tests.count(sql text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute format('with q as (%s) select count(*) from q', sql) into n;
  return n;
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;

create or replace function tests.create_user(p_email text, p_name text default 'طالب') returns uuid
language plpgsql as $$
declare v_id uuid;
begin
  insert into auth.users (email, raw_user_meta_data) values (p_email, jsonb_build_object('full_name', p_name))
  returning id into v_id;
  return v_id;
end;
$$;
