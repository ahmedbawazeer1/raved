-- RLS tests for the remote app config. Run with scripts/test-db.sh.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;

select tests.create_user('cfg-admin@example.com', 'المدير') as ad \gset
select tests.create_user('cfg-student@example.com', 'طالب') as st \gset
update public.profiles set role = 'admin', status = 'active' where id = :'ad';
update public.profiles set status = 'active' where id = :'st';

set local role anon;
select tests.ok(tests.count('select * from public.app_config') = 1, 'anyone can read the app config');
update public.app_config set value = '{}';
select tests.ok(tests.count('select * from public.app_config where value ? ''min_version''') = 1, 'anon cannot change it');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st', 'role', 'authenticated')::text, true);
update public.app_config set value = '{"min_version": "9.9.9"}';
select tests.ok((select value->>'min_version' from public.app_config) = '1.0.0', 'a student cannot change it');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'ad', 'role', 'authenticated')::text, true);
update public.app_config set value = jsonb_set(value, '{min_version}', '"1.1.0"');
select tests.ok((select value->>'min_version' from public.app_config) = '1.1.0', 'the admin changes it');
reset role;

rollback;
