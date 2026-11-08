-- Built units: teachers review them (mark reviewed, ask for a lesson rebuild) on a locked map; students see nothing.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;

select tests.create_user('fu-admin@example.com', 'المدير') as ad \gset
select tests.create_user('fu-teacher@example.com', 'المعلم') as te \gset
select tests.create_user('fu-student@example.com', 'طالب') as st \gset
update public.profiles set role = 'admin', status = 'active' where id = :'ad';
update public.profiles set role = 'teacher', status = 'active' where id = :'te';
update public.profiles set status = 'active' where id = :'st';
select id as english from public.paths where slug = 'english' \gset
select id as a1 from public.levels where code = 'A1' and path_id = :'english' \gset

insert into public.curriculum_levels (level_id, status) values (:'a1', 'approved');
insert into public.curriculum_units (level_id, code, position, title_en, title_ar, stop_ar, situation_ar, task_ar)
values (:'a1', 'A1-01', 1, 'Hello!', 'التحية', 'المكلا', 'أول يوم دراسي في المكلا', 'يعرّف بنفسه لمعلم جديد') returning id as cu \gset
insert into public.agent_jobs (kind, path_id, input, status) values ('factory_unit', :'english', jsonb_build_object('curriculum_unit_id', :'cu'), 'needs_review') returning id as job \gset
insert into public.agent_jobs (kind, path_id, status) values ('plan_level', :'english', 'needs_review') returning id as plan \gset

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'te', 'role', 'authenticated')::text, true);
update public.curriculum_units set teacher_ok_by = :'te', teacher_ok_at = now() where id = :'cu';
select tests.ok((select teacher_ok_by from public.curriculum_units where id = :'cu') = :'te'::uuid, 'teacher marks a built unit reviewed on a locked map');
select tests.throws(format('update public.curriculum_units set stop_ar = ''تريم'' where id = %L', :'cu'), 'the map itself stays locked');
update public.agent_jobs set output = '{"edited": true}'::jsonb where id = :'job';
select tests.ok((select output ->> 'edited' from public.agent_jobs where id = :'job') = 'true', 'teacher edits a unit build');
update public.agent_jobs set status = 'approved' where id = :'plan';
select tests.ok((select status from public.agent_jobs where id = :'plan') = 'needs_review', 'teacher cannot touch other agent jobs');
insert into public.agent_jobs (kind, path_id, input) values ('factory_lesson', :'english', jsonb_build_object('curriculum_unit_id', :'cu'));
select tests.ok((select count(*) from public.agent_jobs where kind = 'factory_lesson') = 1, 'teacher asks for one lesson to be rebuilt');
select tests.throws(format('insert into public.agent_jobs (kind, path_id) values (''plan_level'', %L)', :'english'), 'teacher cannot queue other jobs');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st', 'role', 'authenticated')::text, true);
select tests.ok(tests.count('select * from public.agent_jobs') = 0, 'student sees no builds');
select tests.throws(format('insert into public.agent_jobs (kind, path_id) values (''factory_lesson'', %L)', :'english'), 'student cannot queue a rebuild');
reset role;

rollback;
