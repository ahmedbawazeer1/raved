-- RLS and guard tests for the content agent tables. Run with scripts/test-db.sh.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;

select tests.create_user('agent-admin@example.com', 'المدير') as ad \gset
select tests.create_user('agent-student@example.com', 'طالب') as st \gset
update public.profiles set role = 'admin', status = 'active' where id = :'ad';
update public.profiles set status = 'active' where id = :'st';
select id as english from public.paths where slug = 'english' \gset

-- ---------- admin queues a job ----------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'ad', 'role', 'authenticated')::text, true);
insert into public.agent_jobs (kind, path_id, status, output) values ('plan_path', :'english', 'approved', '{"x":1}');
select tests.ok((select status from public.agent_jobs) = 'queued', 'a new job is always queued');
select tests.ok((select output is null from public.agent_jobs), 'admin cannot write results');
select tests.throws('update public.agent_jobs set status = ''approved''', 'a queued job cannot be approved');
insert into public.agent_memory (path_id, text, source) values (:'english', 'استخدم أمثلة من المكلا', 'manual');
select tests.ok(tests.count('select * from public.agent_memory') = 1, 'admin keeps memory rules');
reset role;

-- ---------- the runner (service role) finishes the job ----------
update public.agent_jobs set status = 'needs_review', progress = 100, output = '{"plan":true}';
select id as job from public.agent_jobs \gset

-- ---------- admin reviews ----------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'ad', 'role', 'authenticated')::text, true);
select tests.throws('update public.agent_jobs set status = ''approved'', output = ''{}''', 'review cannot change the result');
update public.agent_jobs set status = 'rejected', review_note = 'أضف وحدات أكثر' where id = :'job';
select tests.ok((select status = 'rejected' and reviewed_by is not null and reviewed_at is not null from public.agent_jobs), 'admin rejects with a note');
select tests.throws('update public.agent_jobs set status = ''approved''', 'a decided job cannot be changed');
reset role;

-- ---------- students see nothing ----------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st', 'role', 'authenticated')::text, true);
select tests.ok(tests.count('select * from public.agent_jobs') = 0, 'student cannot read agent jobs');
select tests.ok(tests.count('select * from public.agent_memory') = 0, 'student cannot read agent memory');
select tests.throws(format('insert into public.agent_jobs (kind, path_id) values (''plan_path'', %L)', :'english'), 'student cannot queue jobs');
reset role;

rollback;
