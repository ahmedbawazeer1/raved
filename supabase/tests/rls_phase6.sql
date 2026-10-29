-- Phase 6: certificates are earned, never forged; verification shows only first name + initial.
\set ON_ERROR_STOP 1
\set QUIET 1
\set pkg `cat content/examples/A1-01.json`
begin;

select tests.create_user('p6-student@example.com', 'سارة أحمد اليافعي') as st \gset
select tests.create_user('p6-other@example.com', 'آخر') as ot \gset
update public.profiles set status = 'active' where id in (:'st', :'ot');
select id as english from public.paths where slug = 'english' \gset
select id as a1 from public.levels where path_id = :'english' and code = 'A1' \gset
insert into public.enrollments (student_id, path_id, is_primary) values (:'st', :'english', true), (:'ot', :'english', true);

select public.import_unit_package(:'pkg'::jsonb) as unit_id \gset
update public.lessons set review_status = 'approved' where unit_id = :'unit_id';
select public.publish_unit(:'unit_id');
select id as quiz_id from public.quizzes where unit_id = :'unit_id' \gset
-- A1 plans 12 units; for this test one published unit is the whole level.
update public.levels set planned_units = 1 where id = :'a1';
insert into public.lesson_progress (student_id, lesson_id, status, completed_at)
select :'st', id, 'completed', now() from public.lessons where unit_id = :'unit_id';

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st')::text, true);
select tests.ok(public.claim_certificates() = 0, 'no certificate before passing the level');
select tests.throws(format('insert into public.certificates (student_id, path_id, level_id) values (%L, %L, %L)', :'st', :'english', :'a1'), 'student cannot forge a certificate');
select public.submit_quiz(:'quiz_id', '{"A1-01-q1":0,"A1-01-q2":1,"A1-01-q3":1,"A1-01-q4":"are","A1-01-q5":["what''s","your","name"]}'::jsonb);
select tests.ok(public.claim_certificates() = 1, 'passing every unit quiz of the level earns the certificate');
select tests.ok(public.claim_certificates() = 0, 'claiming again creates nothing');
select tests.ok(tests.count('select * from public.certificates') = 1, 'student reads own certificate');
select tests.ok(tests.count('select * from public.notifications where type = ''certificate''') = 1, 'student is notified');
select code as cert_code from public.certificates limit 1 \gset

select set_config('request.jwt.claims', json_build_object('sub', :'ot')::text, true);
select tests.ok(tests.count('select * from public.certificates') = 0, 'other student cannot see it');
select tests.ok(public.claim_certificates() = 0, 'other student did not earn it');
reset role;

set local role anon;
select tests.ok((public.verify_certificate(lower(:'cert_code')) ->> 'name') = 'سارة ا.', 'public check shows first name and last initial only');
select tests.ok((public.verify_certificate(:'cert_code') ->> 'level_code') = 'A1', 'public check shows the level');
select tests.ok(not (public.verify_certificate(:'cert_code')::text like '%@%'), 'public check never shows the email');
select tests.ok(public.verify_certificate('NOPE000000') is null, 'unknown code returns nothing');
select tests.ok(tests.count('select * from public.certificates') = 0, 'anon cannot list certificates');
reset role;

rollback;
