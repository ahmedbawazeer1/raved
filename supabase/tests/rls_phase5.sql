-- Phase 5: AI attempts are server-written; students read only their own.
\set ON_ERROR_STOP 1
\set QUIET 1
\set pkg `cat content/examples/A1-01.json`
begin;

select tests.create_user('p5-student@example.com', 'طالب') as st \gset
select tests.create_user('p5-other@example.com', 'آخر') as ot \gset
select tests.create_user('p5-admin@example.com', 'مدير') as ad \gset
update public.profiles set role = 'admin', status = 'active' where id = :'ad';
update public.profiles set status = 'active' where id in (:'st', :'ot');
select public.import_unit_package(:'pkg'::jsonb) as unit_id \gset
select id as lesson_id from public.lessons where unit_id = :'unit_id' order by position desc limit 1 \gset

-- the server writes attempts and usage
insert into public.speaking_attempts (student_id, lesson_id, prompt_en, transcript, duration_sec, scores, provider, model, prompt_version)
values (:'st', :'lesson_id', 'Introduce yourself.', 'Hello my name is [NAME].', 20, '{"task":4}', 'groq', 'llama', 'speaking-v1') returning id as sp \gset
insert into public.writing_submissions (student_id, lesson_id, prompt_en, text, word_count) values (:'st', :'lesson_id', 'Write about your family.', 'My family is big.', 4) returning id as wr \gset
insert into public.ai_usage (student_id, feature, provider, model, ok) values (:'st', 'speaking', 'groq', 'llama', true);
select tests.ok((select status from public.writing_submissions where id = :'wr') = 'queued', 'writing waits for evaluation by default');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st')::text, true);
select tests.ok(tests.count('select * from public.speaking_attempts') = 1, 'student reads own speaking attempt');
select tests.ok(tests.count('select * from public.writing_submissions') = 1, 'student reads own writing');
select tests.ok(tests.count('select * from public.ai_usage') = 1, 'student reads own AI usage');
select tests.throws(format('insert into public.speaking_attempts (student_id, lesson_id, prompt_en, transcript, duration_sec, scores) values (%L, %L, ''x'', ''x'', 1, ''{"task":5}'')', :'st', :'lesson_id'), 'student cannot forge a speaking score');
select tests.throws(format('insert into public.writing_submissions (student_id, lesson_id, prompt_en, text, word_count, status, scores) values (%L, %L, ''x'', ''x'', 1, ''evaluated'', ''{}'')', :'st', :'lesson_id'), 'student cannot forge a writing score');
select tests.ok(tests.count(format('update public.writing_submissions set scores = ''{"grammar":5}'' where id = %L returning id', :'wr')) = 0, 'student cannot change a score');
select tests.throws(format('insert into public.ai_usage (student_id, feature, provider, model, ok) values (%L, ''speaking'', ''groq'', ''x'', false)', :'st'), 'student cannot write usage rows');
select tests.ok(tests.count('select * from public.ai_reviews') = 0, 'student cannot read reviews');

select set_config('request.jwt.claims', json_build_object('sub', :'ot')::text, true);
select tests.ok(tests.count('select * from public.speaking_attempts') = 0, 'other student cannot read the transcript');
select tests.ok(tests.count('select * from public.writing_submissions') = 0, 'other student cannot read the writing');
reset role;

set local role anon;
select tests.ok(tests.count('select * from public.speaking_attempts') = 0, 'anon: no transcripts');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'ad')::text, true);
select tests.ok(tests.count('select * from public.speaking_attempts') = 1, 'admin reads attempts for review');
insert into public.ai_reviews (attempt_type, attempt_id, reviewer_id, agrees) values ('speaking', :'sp', :'ad', true);
select tests.ok(tests.count('select * from public.ai_reviews') = 1, 'admin records agreement');
select tests.throws(format('insert into public.ai_reviews (attempt_type, attempt_id, reviewer_id, agrees) values (''writing'', %L, %L, false)', :'wr', :'st'), 'review is recorded under the reviewer''s own id');
reset role;

rollback;
