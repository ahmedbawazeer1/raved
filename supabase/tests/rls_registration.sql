-- Registration without a teacher recommendation (owner decision 2026-11-02). Run with scripts/test-db.sh.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;

select tests.create_user('noreco@example.com', 'ريم أحمد') as s \gset
select id as english from public.paths where slug = 'english' \gset

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'s', 'role', 'authenticated')::text, true);
update public.profiles set birth_date = '2009-05-01', governorate = 'hadramawt', city = 'المكلا', school = 'مدرسة المكلا',
  grade = 2, stream = 'science', phone = '+967731234567' where id = :'s';
insert into public.applications (student_id) values (:'s');
update public.applications set path_id = :'english', target_exam = 'ielts', target_date = 'grad_summer', daily_minutes = 25 where student_id = :'s';
select tests.throws('select public.submit_application(false, true)', 'guardian consent still required');
select tests.ok(public.submit_application(true, true) in ('submitted', 'approved'), 'submits without a recommendation');
select tests.ok((select recommendation_path is null from public.applications where student_id = :'s'), 'no file needed');
reset role;

rollback;
