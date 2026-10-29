-- Phase 2: import, review/publish, quiz secrecy and server grading.
\set ON_ERROR_STOP 1
\set QUIET 1
\set pkg `cat content/examples/A1-01.json`
begin;

select tests.create_user('p2-student@example.com', 'طالب') as st \gset
select tests.create_user('p2-pending@example.com', 'معلّق') as pe \gset
select tests.create_user('p2-admin@example.com', 'مدير') as ad \gset
update public.profiles set role = 'admin', status = 'active' where id = :'ad';
update public.profiles set status = 'active' where id = :'st';

-- student cannot import
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st')::text, true);
select tests.throws(format('select public.import_unit_package(%L::jsonb)', :'pkg'), 'student cannot import units');
reset role;

-- admin imports
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'ad')::text, true);
select public.import_unit_package(:'pkg'::jsonb) as unit_id \gset
select tests.ok((select status from public.units where id = :'unit_id') = 'review', 'imported unit waits for review');
select tests.ok((select count(*) from public.lessons where unit_id = :'unit_id') = 2, 'lessons imported');
select tests.ok((select sum(jsonb_array_length(blocks)) from public.lessons where unit_id = :'unit_id') = 5, 'blocks imported');
select tests.ok((select count(*) from public.vocab_items where unit_id = :'unit_id') = 8, 'vocab imported');
select tests.ok((select jsonb_array_length(k.questions) from public.quiz_keys k join public.quizzes z on z.id = k.quiz_id where z.unit_id = :'unit_id') = 5, 'quiz imported');
select tests.throws(format('select public.publish_unit(%L)', :'unit_id'), 'cannot publish before every lesson is approved');
update public.lessons set review_status = 'approved' where unit_id = :'unit_id';
select public.publish_unit(:'unit_id');
select tests.ok((select status from public.units where id = :'unit_id') = 'published', 'admin publishes unit');
reset role;

select id as quiz_id from public.quizzes where unit_id = :'unit_id' \gset
select l.id as lesson_id from public.lessons l where l.unit_id = :'unit_id' order by position limit 1 \gset

-- re-import keeps lesson ids (progress survives) and handles reordering
select tests.ok(public.import_unit_package(jsonb_set(:'pkg'::jsonb, '{version}', '2')) = :'unit_id'::uuid, 're-import updates the same unit');
select tests.ok((select id from public.lessons l where l.unit_id = :'unit_id' order by position limit 1) = :'lesson_id'::uuid, 'lesson id stable across re-import');
select tests.ok((select status from public.units where id = :'unit_id') = 'published', 're-import keeps a published unit published');
select tests.ok((select version from public.units where id = :'unit_id') = 2, 'version bumped');
update public.lessons set review_status = 'approved' where unit_id = :'unit_id';

-- re-import with one lesson removed and one word removed: archived, never deleted
select public.import_unit_package(
  jsonb_set(jsonb_set(jsonb_set(:'pkg'::jsonb, '{version}', '3'), '{lessons}', (:'pkg'::jsonb -> 'lessons') - 1), '{vocab}', (:'pkg'::jsonb -> 'vocab') - 7)
);
select tests.ok((select count(*) from public.lessons where unit_id = :'unit_id' and archived) = 1, 'removed lesson is archived');
select tests.ok((select count(*) from public.vocab_items where unit_id = :'unit_id' and archived) = 1, 'removed word is archived');
select public.import_unit_package(:'pkg'::jsonb);
select tests.ok((select count(*) from public.lessons where unit_id = :'unit_id' and not archived) = 2, 'lesson comes back on re-import');
update public.lessons set review_status = 'approved' where unit_id = :'unit_id';
-- the unit quiz opens after the unit's lessons (completed here directly, as the server would)
insert into public.lesson_progress (student_id, lesson_id, status, completed_at)
select :'st', id, 'completed', now() from public.lessons where unit_id = :'unit_id' and not archived;

-- active student
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st')::text, true);
select tests.ok(tests.count('select * from public.quiz_keys') = 0, 'student cannot read quiz answer keys');
select tests.ok(tests.count('select * from public.unit_packages') = 0, 'student cannot read raw packages');
select tests.ok(public.get_quiz(:'quiz_id') -> 'questions' -> 0 ? 'prompt', 'get_quiz returns prompts');
select tests.ok(not (public.get_quiz(:'quiz_id')::text like '%"answer"%'), 'get_quiz never returns answers');
select tests.ok(jsonb_array_length(public.get_quiz(:'quiz_id') -> 'questions' -> 4 -> 'words') = 3, 'order_words gets its words');
select tests.ok(tests.count('select * from public.vocab_items') = 8, 'student reads vocab of published unit');

select public.submit_quiz(:'quiz_id', '{"A1-01-q1":0,"A1-01-q2":1,"A1-01-q3":1,"A1-01-q4":" Are. ","A1-01-q5":["What''s","your","name"]}'::jsonb) as att1 \gset
select tests.ok((select score from public.quiz_attempts where id = :'att1') = 100, 'all correct scores 100 (normalised answers)');
select tests.ok((select passed from public.quiz_attempts where id = :'att1'), 'passed');
select public.submit_quiz(:'quiz_id', '{"A1-01-q1":2,"A1-01-q2":"1"}'::jsonb, 'aaaaaaaa-0000-0000-0000-000000000001', now(), true) as att2 \gset
select tests.ok((select score from public.quiz_attempts where id = :'att2') = 0, 'wrong/missing/typed-wrong answers are not counted');
select tests.ok(public.submit_quiz(:'quiz_id', '{}'::jsonb, 'aaaaaaaa-0000-0000-0000-000000000001') = :'att2'::uuid, 'same client id is idempotent');
select tests.ok((select results -> 0 ->> 'explanation_ar' from public.quiz_attempts where id = :'att2') is not null, 'results include explanations');
select tests.throws(format('insert into public.quiz_attempts (student_id, quiz_id, answers, results, correct, total, score, passed) values (%L, %L, ''{}'', ''[]'', 5, 5, 100, true)', :'st', :'quiz_id'), 'student cannot forge an attempt');

select tests.throws(format('update public.lesson_progress set completed_at = now() - interval ''1 day'' where student_id = %L', :'st'), 'student cannot change completion directly');
update public.lesson_progress set rating = 'useful' where student_id = :'st' and lesson_id = :'lesson_id';
select tests.ok(tests.count('select * from public.lesson_progress where rating = ''useful''') = 1, 'student rates own lesson');
select tests.throws(format('insert into public.lesson_progress (student_id, lesson_id) values (%L, %L)', :'pe', :'lesson_id'), 'cannot write progress for another student');
insert into public.reports (student_id, lesson_id, kind, note) values (:'st', :'lesson_id', 'error', 'خطأ إملائي');
select tests.ok(tests.count('select * from public.reports') = 1, 'student reports an error');
reset role;

-- pending student
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'pe')::text, true);
select tests.throws(format('select public.get_quiz(%L)', :'quiz_id'), 'pending student cannot open quizzes');
select tests.throws(format('select public.submit_quiz(%L, ''{}'')', :'quiz_id'), 'pending student cannot submit quizzes');
select tests.ok(tests.count('select * from public.vocab_items') = 0, 'pending student cannot read vocab');
select tests.throws(format('insert into public.lesson_progress (student_id, lesson_id) values (%L, %L)', :'pe', :'lesson_id'), 'pending student cannot record progress');
select tests.ok(tests.count('select * from public.lesson_progress') = 0, 'cannot see others progress');
reset role;

-- unpublished unit is closed to students
update public.units set status = 'review' where id = :'unit_id';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st')::text, true);
select tests.throws(format('select public.get_quiz(%L)', :'quiz_id'), 'quiz of unpublished unit is closed');
select tests.ok(tests.count('select * from public.lessons') = 0, 'lessons of unpublished unit are hidden');
reset role;

-- anon
set local role anon;
select set_config('request.jwt.claims', '', true);
select tests.throws(format('select public.get_quiz(%L)', :'quiz_id'), 'anon cannot open quizzes');
reset role;

rollback;
\echo 'ALL PHASE 2 TESTS PASSED'
