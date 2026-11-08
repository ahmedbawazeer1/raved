-- Video parts: one episode split across lessons; each part must be watched on its own.
\set ON_ERROR_STOP 1
\set QUIET 1
\set pkg `cat content/examples/A1-01.json`
begin;

select tests.create_user('vp-student@example.com', 'طالب') as st \gset
update public.profiles set status = 'active' where id = :'st';
select id as english from public.paths where slug = 'english' \gset
insert into public.enrollments (student_id, path_id, is_primary) values (:'st', :'english', true);

-- Lessons 1 and 2 use two parts (0–100 s and 100–200 s) of the same episode.
select public.import_unit_package(
  jsonb_set(
    jsonb_set(:'pkg'::jsonb, '{lessons,0,blocks,3}', '{"type":"video","youtube_id":"episode0001","start_sec":0,"end_sec":100,"duration_sec":100}'),
    '{lessons,1,blocks,0}', '{"type":"video","youtube_id":"episode0001","start_sec":100,"end_sec":200,"duration_sec":100}'
  ) #- '{lessons,0,writing_task}' #- '{lessons,0,speaking_task}' #- '{lessons,1,writing_task}' #- '{lessons,1,speaking_task}'
) as u1 \gset
update public.lessons set review_status = 'approved' where unit_id = :'u1';
select public.publish_unit(:'u1');
select id as l1 from public.lessons where unit_id = :'u1' order by position limit 1 \gset
select id as l2 from public.lessons where unit_id = :'u1' order by position offset 1 limit 1 \gset

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st')::text, true);
select tests.throws_msg(format('select public.complete_lesson(%L)', :'l1'), 'video_required', 'the first part must be watched');
select tests.ok((public.record_video_part('episode0001', 0, 100) ->> 'watched_sec')::int <= 15, 'cannot claim the whole part at once');
select tests.throws('select public.record_video_part(''episode0001'', 50, 10)', 'an unknown part is refused');
reset role;
update public.video_part_views set first_seen_at = now() - interval '2 minutes' where student_id = :'st';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st')::text, true);
select tests.ok((public.record_video_part('episode0001', 0, 85) ->> 'done')::boolean, 'watching 85% of the part completes it');
select tests.ok(public.complete_lesson(:'l1') ->> 'ok' = 'true', 'lesson 1 completes after its part');
select tests.throws_msg(format('select public.complete_lesson(%L)', :'l2'), 'video_required', 'the first part does not count for the second');
select tests.ok(tests.count('select * from public.video_part_views') = 1, 'student reads own part progress');
reset role;

rollback;
