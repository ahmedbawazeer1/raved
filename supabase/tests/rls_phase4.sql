-- Phase 4: vocabulary reviews, placement secrecy, skill estimates.
\set ON_ERROR_STOP 1
\set QUIET 1
\set pkg `cat content/examples/A1-01.json`
begin;

select tests.create_user('p4-student@example.com', 'طالب') as st \gset
select tests.create_user('p4-other@example.com', 'آخر') as ot \gset
select tests.create_user('p4-pending@example.com', 'معلّق') as pe \gset
select tests.create_user('p4-admin@example.com', 'مدير') as ad \gset
update public.profiles set role = 'admin', status = 'active' where id = :'ad';
update public.profiles set status = 'active' where id in (:'st', :'ot');
select id as english from public.paths where slug = 'english' \gset

-- content
select public.import_unit_package(:'pkg'::jsonb) as unit_id \gset
update public.lessons set review_status = 'approved' where unit_id = :'unit_id';
select public.publish_unit(:'unit_id');
select id as word_id from public.vocab_items where unit_id = :'unit_id' order by position limit 1 \gset
select id as quiz_id from public.quizzes where unit_id = :'unit_id' \gset
insert into public.lesson_progress (student_id, lesson_id, status, completed_at)
select :'st', id, 'completed', now() from public.lessons where unit_id = :'unit_id';

-- placement bank was seeded by its migration
select tests.ok((select count(*) from public.placement_questions where path_id = :'english' and not archived) = 40, 'placement bank seeded (40 questions)');

-- student: placement questions and answers are hidden
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st')::text, true);
select tests.ok(tests.count('select * from public.placement_questions') = 0, 'student cannot read placement questions or answers');
select tests.throws(format('select public.import_placement_bank(%L, ''{"questions":[]}''::jsonb)', 'english'), 'student cannot import a placement bank');
select tests.throws(format('insert into public.placement_attempts (student_id, path_id, state) values (%L, %L, ''{}'')', :'st', :'english'), 'student cannot forge a placement attempt');
select tests.throws(format('insert into public.skill_estimates (student_id, path_id, skill, level, source) values (%L, %L, ''reading'', ''B2'', ''placement'')', :'st', :'english'), 'student cannot set their own skill level');

-- vocabulary reviews: own rows only
insert into public.vocab_reviews (student_id, vocab_item_id, interval_days, repetitions, due_at, last_result, last_reviewed_at, review_count)
values (:'st', :'word_id', 1, 1, now() + interval '1 day', 'good', now(), 1);
select tests.ok(tests.count('select * from public.vocab_reviews') = 1, 'student saves a word review');
select tests.throws(format('insert into public.vocab_reviews (student_id, vocab_item_id) values (%L, %L)', :'ot', :'word_id'), 'cannot write a review for another student');
update public.vocab_reviews set interval_days = 3 where student_id = :'st';
select tests.ok((select interval_days from public.vocab_reviews where student_id = :'st') = 3, 'student updates own review');

-- quiz → skill estimates (all correct: grammar 4/4, vocab 1/1 at A1)
select public.submit_quiz(:'quiz_id', '{"A1-01-q1":0,"A1-01-q2":1,"A1-01-q3":1,"A1-01-q4":"are","A1-01-q5":["what''s","your","name"]}'::jsonb);
select tests.ok((select level from public.skill_estimates where student_id = :'st' and skill = 'grammar') = 'A1', 'passing a quiz sets the skill estimate');
select tests.ok(tests.count('select * from public.skill_estimates') = 2, 'student reads own skill estimates');
reset role;

-- a higher placement estimate is not lowered by an A1 quiz
update public.skill_estimates set level = 'B1', source = 'placement' where student_id = :'st' and skill = 'grammar';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st')::text, true);
select public.submit_quiz(:'quiz_id', '{"A1-01-q1":0,"A1-01-q2":1,"A1-01-q3":1,"A1-01-q4":"are","A1-01-q5":["what''s","your","name"]}'::jsonb);
select tests.ok((select level from public.skill_estimates where student_id = :'st' and skill = 'grammar') = 'B1', 'a quiz never lowers a higher estimate');
reset role;

-- server (service role) writes an attempt; the other student cannot see it
insert into public.placement_attempts (student_id, path_id, state) values (:'st', :'english', '{"level":"A2"}');
select tests.throws(format('insert into public.placement_attempts (student_id, path_id, state) values (%L, %L, ''{}'')', :'st', :'english'), 'only one open placement attempt per path');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st')::text, true);
select tests.ok(tests.count('select * from public.placement_attempts') = 1, 'student reads own placement attempt');
select tests.ok(tests.count('select * from public.placement_attempts where state ? ''answers''') = 0, 'attempt state carries no answer key');
select set_config('request.jwt.claims', json_build_object('sub', :'ot')::text, true);
select tests.ok(tests.count('select * from public.placement_attempts') = 0, 'other student cannot see the attempt');
select tests.ok(tests.count('select * from public.vocab_reviews') = 0, 'other student cannot see the reviews');
select tests.ok(tests.count('select * from public.skill_estimates') = 0, 'other student cannot see the estimates');
reset role;

-- pending student cannot start reviewing
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'pe')::text, true);
select tests.throws(format('insert into public.vocab_reviews (student_id, vocab_item_id) values (%L, %L)', :'pe', :'word_id'), 'pending student cannot review words');
reset role;

-- anon sees nothing
set local role anon;
select tests.ok(tests.count('select * from public.vocab_reviews') = 0, 'anon: no reviews');
select tests.ok(tests.count('select * from public.placement_attempts') = 0, 'anon: no attempts');
reset role;

-- admin
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'ad')::text, true);
select tests.ok(tests.count('select * from public.placement_questions') = 40, 'admin reads the placement bank');
select tests.ok(public.import_placement_bank('english', jsonb_build_object('questions', (select jsonb_agg(jsonb_build_object('id', item_key, 'level', level, 'skill', skill, 'prompt', item ->> 'prompt', 'options', item -> 'options', 'answer', answer, 'listen', item ->> 'listen', 'text', item ->> 'text') order by position) from public.placement_questions where position <= 39))) = 39, 'admin re-imports a bank');
select tests.ok((select count(*) from public.placement_questions where archived) = 1, 'question missing from the file is archived, not deleted');
reset role;

rollback;
