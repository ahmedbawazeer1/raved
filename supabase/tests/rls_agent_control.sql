-- RLS tests for agent traces and the pause switch. Run with scripts/test-db.sh.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;

select tests.create_user('ctl-admin@example.com', 'المدير') as ad \gset
select tests.create_user('ctl-student@example.com', 'طالب') as st \gset
update public.profiles set role = 'admin', status = 'active' where id = :'ad';
update public.profiles set status = 'active' where id = :'st';
select id as english from public.paths where slug = 'english' \gset

-- the runner (service role) writes a job and its traces
insert into public.agent_jobs (kind, path_id) values ('plan_path', :'english') returning id as job \gset
insert into public.agent_traces (job_id, kind, step, ok) values (:'job', 'model', 'outline', true);
select tests.ok((select value from public.settings where key = 'agent_paused') = 'false'::jsonb, 'the agent starts unpaused');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'ad', 'role', 'authenticated')::text, true);
select tests.ok(tests.count('select * from public.agent_traces') = 1, 'admin reads traces');
select tests.throws(format('insert into public.agent_traces (job_id, kind, ok) values (%L, ''model'', true)', :'job'), 'admin cannot fake traces');
update public.settings set value = 'true'::jsonb where key = 'agent_paused';
select tests.ok((select value from public.settings where key = 'agent_paused') = 'true'::jsonb, 'admin pauses the agent');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st', 'role', 'authenticated')::text, true);
select tests.ok(tests.count('select * from public.agent_traces') = 0, 'student cannot read traces');
select tests.ok(tests.count('select * from public.settings where key = ''agent_paused''') = 0, 'student cannot read the pause switch');
reset role;

rollback;
