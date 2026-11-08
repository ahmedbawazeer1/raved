-- RLS tests for the content factory: teachers, path profile, video sources, templates, level map.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;

select tests.create_user('cf-admin@example.com', 'المدير') as ad \gset
select tests.create_user('cf-teacher@example.com', 'المعلم') as te \gset
select tests.create_user('cf-student@example.com', 'طالب') as st \gset
update public.profiles set role = 'admin', status = 'active' where id = :'ad';
update public.profiles set status = 'active' where id = :'st';
select id as english from public.paths where slug = 'english' \gset
select id as a1 from public.levels where code = 'A1' and path_id = :'english' \gset

select tests.ok((select count(*) from public.content_templates) = 5, 'the default templates are seeded');
select tests.ok((select profile -> 'levels' -> 0 ->> 'video_language' from public.path_profiles where path_id = :'english') = 'ar', 'English A1 videos are in Arabic');
select tests.ok((select count(*) from public.video_sources where path_id = :'english') = 1, 'the A1 playlist is a trusted source');

-- the admin makes a teacher by email
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'ad', 'role', 'authenticated')::text, true);
select public.set_teacher('CF-Teacher@example.com', true);
select tests.throws('select public.set_teacher(''nobody@example.com'', true)', 'an unknown email is refused');
select tests.throws(format('select public.set_teacher(%L, false)', 'cf-admin@example.com'), 'an admin cannot be turned into a student');
insert into public.curriculum_levels (level_id, status) values (:'a1', 'review');
insert into public.curriculum_units (level_id, code, position, title_en, title_ar, stop_ar, situation_ar, task_ar)
values (:'a1', 'A1-01', 1, 'Hello!', 'التحية', 'المكلا', 'أول يوم دراسي في المكلا', 'يعرّف بنفسه لمعلم جديد');
reset role;
select tests.ok((select role from public.profiles where id = :'te') = 'teacher', 'the account is now a teacher');
select tests.ok((select status from public.profiles where id = :'te') = 'active', 'teachers are active');

-- the teacher reviews and edits, but cannot approve or change templates and profiles
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'te', 'role', 'authenticated')::text, true);
select tests.ok(tests.count('select * from public.content_templates') = 5, 'teacher reads templates');
select tests.ok(tests.count('select * from public.path_profiles') = 1, 'teacher reads the path profile');
select tests.throws('select public.set_teacher(''cf-student@example.com'', true)', 'teacher cannot add teachers');
update public.content_templates set title_ar = 'تغيير' where key = 'vocab';
select tests.ok((select count(*) from public.content_templates where title_ar = 'تغيير') = 0, 'teacher cannot change templates');
update public.path_profiles set profile = '{}'::jsonb;
select tests.ok((select count(*) from public.path_profiles where profile = '{}'::jsonb) = 0, 'teacher cannot change the path profile');
insert into public.video_sources (path_id, kind, ref, title, language, levels) values (:'english', 'channel', '@bbclearningenglish', 'BBC Learning English', 'en', '{B1,B2}');
select tests.ok(tests.count('select * from public.video_sources') = 2, 'teacher adds a trusted channel');
update public.curriculum_units set stop_ar = 'الشحر' where code = 'A1-01';
select tests.ok((select stop_ar from public.curriculum_units where code = 'A1-01') = 'الشحر', 'teacher edits the map');
update public.curriculum_levels set teacher_ok_by = :'te', teacher_ok_at = now() where level_id = :'a1';
select tests.ok((select teacher_ok_by from public.curriculum_levels where level_id = :'a1') = :'te'::uuid, 'teacher marks the map reviewed');
select tests.throws(format('update public.curriculum_levels set status = ''approved'' where level_id = %L', :'a1'), 'teacher cannot approve the map');
reset role;

-- once the admin approves, the map is locked for the teacher
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'ad', 'role', 'authenticated')::text, true);
update public.curriculum_levels set status = 'approved', approved_by = :'ad', approved_at = now() where level_id = :'a1';
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'te', 'role', 'authenticated')::text, true);
select tests.throws('update public.curriculum_units set stop_ar = ''تريم'' where code = ''A1-01''', 'an approved map is locked for teachers');
reset role;

-- a draft path being built in the studio: the teacher sees it, students do not
insert into public.paths (slug, title, status) values ('studio-draft', 'مسار تجريبي', 'draft') returning id as draft \gset
insert into public.levels (path_id, code, title, position) values (:'draft', 'L1', 'الأساسيات', 1);
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'te', 'role', 'authenticated')::text, true);
select tests.ok(tests.count(format('select * from public.levels where path_id = %L', :'draft')) = 1, 'teacher sees the levels of a draft path');
select tests.throws(format('insert into public.levels (path_id, code, title, position) values (%L, ''L2'', ''x'', 2)', :'draft'), 'teacher cannot add levels');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st', 'role', 'authenticated')::text, true);
select tests.ok(tests.count('select * from public.paths where slug = ''studio-draft''') = 0, 'student cannot see a draft path');
reset role;

-- students see none of it
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st', 'role', 'authenticated')::text, true);
select tests.ok(tests.count('select * from public.content_templates') = 0, 'student cannot read templates');
select tests.ok(tests.count('select * from public.curriculum_units') = 0, 'student cannot read the map');
select tests.ok(tests.count('select * from public.video_sources') = 0, 'student cannot read video sources');
select tests.ok(tests.count('select * from public.agent_jobs') = 0, 'student cannot read agent jobs');
select tests.throws('select public.set_teacher(''cf-student@example.com'', true)', 'student cannot make teachers');
reset role;

rollback;
