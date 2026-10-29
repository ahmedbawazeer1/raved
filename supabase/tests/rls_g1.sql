-- Gamification 1: locked path, mandatory video, points.
\set ON_ERROR_STOP 1
\set QUIET 1
\set pkg `cat content/examples/A1-01.json`
begin;

select tests.create_user('g1-student@example.com', 'طالب') as st \gset
update public.profiles set status = 'active' where id = :'st';
select id as english from public.paths where slug = 'english' \gset
insert into public.enrollments (student_id, path_id, is_primary) values (:'st', :'english', true);

-- Unit 1: lesson 1 has a real (checked) 100-second video and no task; lesson 2 has a speaking task.
select public.import_unit_package(
  (jsonb_set(:'pkg'::jsonb, '{lessons,0,blocks,3}', '{"type":"video","youtube_id":"abcdefghijk","duration_sec":100,"optional":true}') #- '{lessons,0,writing_task}') || '{"stop_ar":"المكلا"}'
) as u1 \gset
-- Unit 2: same package under another code.
select public.import_unit_package(
  replace(:'pkg', 'A1-01', 'A1-02')::jsonb || '{"position":2,"stop_ar":"الشحر"}'
) as u2 \gset
update public.lessons set review_status = 'approved' where unit_id in (:'u1', :'u2');
select public.publish_unit(:'u1');
select public.publish_unit(:'u2');
select tests.ok((select stop_ar from public.units where id = :'u1') = 'المكلا', 'journey stop comes from the package');

select id as l1 from public.lessons where unit_id = :'u1' order by position limit 1 \gset
select id as l2 from public.lessons where unit_id = :'u1' order by position offset 1 limit 1 \gset
select id as q1 from public.quizzes where unit_id = :'u1' \gset
select id as u2l1 from public.lessons where unit_id = :'u2' order by position limit 1 \gset

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st')::text, true);

-- direct completion is refused
select tests.throws(format('insert into public.lesson_progress (student_id, lesson_id, status, completed_at) values (%L, %L, ''completed'', now())', :'st', :'l1'), 'student cannot mark a lesson completed directly');

-- order: lesson 2 and unit 2 are locked
select tests.throws_msg(format('select public.complete_lesson(%L)', :'l2'), 'locked', 'second lesson is locked before the first');
select tests.throws_msg(format('select public.complete_lesson(%L)', :'u2l1'), 'locked', 'next unit is locked');

-- the video must be watched (80%)
select tests.throws_msg(format('select public.complete_lesson(%L)', :'l1'), 'video_required', 'lesson needs its video');
select tests.ok((public.record_video_watch('abcdefghijk', 100) ->> 'watched_sec')::int <= 15, 'cannot claim the whole video at once');
select tests.throws('select public.record_video_watch(''zzzzzzzzzzz'', 10)', 'unknown video is refused');
reset role;
update public.video_views set first_seen_at = now() - interval '2 minutes' where student_id = :'st';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st')::text, true);
select tests.ok((public.record_video_watch('abcdefghijk', 85) ->> 'done')::boolean, 'watching 85% completes the video');
select tests.ok((public.record_video_watch('abcdefghijk', 10) ->> 'watched_sec')::int = 85, 'watched time never goes down');
select tests.ok(public.complete_lesson(:'l1') ->> 'ok' = 'true', 'lesson completes after the video');

-- quiz is locked until every lesson is done
select tests.throws_msg(format('select public.submit_quiz(%L, ''{}'')', :'q1'), 'locked', 'unit quiz is locked before the lessons');

-- the speaking task is required while AI runs
select tests.throws_msg(format('select public.complete_lesson(%L)', :'l2'), 'speaking_required', 'speaking lesson needs an attempt');
reset role;
insert into public.speaking_attempts (student_id, lesson_id, prompt_en, transcript, duration_sec) values (:'st', :'l2', 'x', 'Hello, I am Ali.', 20);
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st')::text, true);
select tests.ok(public.complete_lesson(:'l2') ->> 'ok' = 'true', 'speaking lesson completes after an attempt');

select public.submit_quiz(:'q1', '{"A1-01-q1":0,"A1-01-q2":1,"A1-01-q3":1,"A1-01-q4":"are","A1-01-q5":["what''s","your","name"]}'::jsonb);
-- passing unit 1 opens unit 2 (its unchecked placeholder video does not block; its writing task does)
select tests.throws_msg(format('select public.complete_lesson(%L)', :'u2l1'), 'writing_required', 'next unit opens after the quiz; writing is required');
select tests.ok((select sum(points) from public.xp_events) = 10 + 10 + 5 + 5 + 20 + 10, 'points: 2 lessons, video, speaking, quiz pass and perfect score');
select tests.ok(tests.count('select * from public.video_views') = 1, 'student reads own video progress');
select tests.throws('insert into public.xp_events (student_id, kind, ref, points) values (auth.uid(), ''lesson'', ''x'', 999)', 'student cannot add points');
reset role;

-- while AI is paused, speaking/writing do not block
insert into public.settings (key, value) values ('ai_paused', 'true') on conflict (key) do update set value = 'true';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st')::text, true);
select tests.ok(public.complete_lesson(:'u2l1') ->> 'ok' = 'true', 'AI paused: writing does not block');
reset role;
rollback;
