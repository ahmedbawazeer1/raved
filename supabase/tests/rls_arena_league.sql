-- Arena, water league, circles: answer keys stay hidden, results are computed by the server.
\set ON_ERROR_STOP 1
\set QUIET 1
\set pkg `cat content/examples/A1-01.json`
begin;

select tests.create_user('ar-one@example.com', 'سالم أحمد') as s1 \gset
select tests.create_user('ar-two@example.com', 'منى علي') as s2 \gset
update public.profiles set status = 'active' where id in (:'s1', :'s2');
select id as english from public.paths where slug = 'english' \gset
insert into public.enrollments (student_id, path_id, is_primary) values (:'s1', :'english', true), (:'s2', :'english', true);
select public.import_unit_package(:'pkg'::jsonb) as u1 \gset
update public.lessons set review_status = 'approved' where unit_id = :'u1';
select public.publish_unit(:'u1');
insert into public.lesson_progress (student_id, lesson_id, status, completed_at)
  select s, id, 'completed', now() from public.lessons, unnest(array[:'s1'::uuid, :'s2'::uuid]) s where unit_id = :'u1';

select tests.ok((select league_opt_in from public.profiles where id = :'s1'), 'new students are in the league by default');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'s1')::text, true);

-- Arena
select tests.throws_msg('select public.arena_start(''chess'')', 'unknown_game', 'unknown games are refused');
select public.arena_start('drops', 'online') as run \gset
select (:'run'::jsonb ->> 'id') as run_id \gset
select tests.ok(:'run'::jsonb -> 'questions' -> 0 ? 'options', 'a drops question has options');
select tests.ok(not (:'run'::text like '%answer%'), 'the answer key is not sent');
select tests.ok(:'run'::jsonb -> 'opponent' ->> 'kind' = 'bot', 'nobody else played yet: a bot');
select tests.ok(tests.count('select * from public.arena_runs') = 0, 'students cannot read runs (the key is in the row)');
select tests.throws('update public.profiles set league_tier = 5 where id = auth.uid()', 'students cannot change their tier');
reset role;
select answer_key as key from public.arena_runs where id = :'run_id' \gset
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'s1')::text, true);
select tests.ok(count(*) = jsonb_array_length(:'key'::jsonb), 'each right answer is accepted')
  from jsonb_array_elements_text(:'key'::jsonb) with ordinality k(v, i) where (public.arena_answer(:'run_id', (i - 1)::int, v) ->> 'ok')::boolean;
select tests.throws_msg(format('select public.arena_answer(%L, 0, ''x'')', :'run_id'), 'already_answered', 'an answer cannot be changed');
select public.arena_finish(:'run_id') as res \gset
select tests.ok((:'res'::jsonb ->> 'score')::int = (:'res'::jsonb ->> 'total')::int, 'right answers score full marks');
select tests.ok((:'res'::jsonb ->> 'drops')::int = 5, 'a good run earns 5 drops');
select tests.throws_msg(format('select public.arena_finish(%L)', :'run_id'), 'already_finished', 'a run is graded once');
select (public.arena_start('drops') ->> 'id') as run2 \gset
select tests.ok(not (public.arena_answer(:'run2', 0, 'wrong') ->> 'ok')::boolean, 'a wrong answer is marked wrong');
select tests.ok((public.arena_finish(:'run2') ->> 'drops')::int = 0, 'no drops for a weak run');
select tests.ok((public.arena_today() ->> 'drops')::int = 5, 'today''s arena drops');
select tests.ok(public.arena_start('bridge') -> 'questions' -> 0 ? 'tiles', 'bridge has tiles');
select tests.ok(public.arena_start('errors') -> 'questions' -> 0 ? 'words', 'errors has words');
select tests.ok(jsonb_typeof(public.arena_start('echo') -> 'questions' -> 0 -> 'say') = 'string', 'echo has a sentence to say');
select tests.ok(public.arena_start('net') -> 'questions' -> 0 ? 'prompt', 'net has a meaning to catch');

-- The second student meets the first one's recorded run online.
select set_config('request.jwt.claims', json_build_object('sub', :'s2')::text, true);
select tests.ok(public.arena_start('drops', 'online') -> 'opponent' ->> 'kind' = 'ghost', 'online meets a real recorded run');
select tests.throws_msg(format('select public.arena_answer(%L, 1, ''x'')', :'run2'), 'not_found', 'cannot answer another student''s run');

-- League: earning drops puts both in the same group of the lowest tier.
select tests.ok((public.weekly_league() -> 'me' ->> 'tier')::int = 0, 'everyone starts in ينبوع');
select tests.ok(jsonb_array_length(public.weekly_league() -> 'rows') = 2, 'the group shows its members');
select tests.ok(tests.count('select * from public.league_members') = 1, 'students read only their own membership');
select public.set_league_opt_in(false);
select tests.ok(public.weekly_league() -> 'me' ->> 'joined' = 'false', 'opting out leaves the group');
select public.set_league_opt_in(true);
reset role;

-- The week ends (Friday 00:00): the top 5 go up.
update public.league_groups set starts_at = starts_at - interval '7 days';
update public.league_members set starts_at = starts_at - interval '7 days';
update public.xp_events set created_at = created_at - interval '7 days';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'s1')::text, true);
select public.weekly_league() as lg \gset
select tests.ok(:'lg'::jsonb -> 'result' ->> 'outcome' = 'up', 'top of the group goes up');
select tests.ok((:'lg'::jsonb -> 'me' ->> 'tier')::int = 1, 'now in جدول');
select public.league_result_seen();
select tests.ok(public.weekly_league() -> 'result' = 'null'::jsonb, 'the announcement shows once');

-- Circles
select public.create_circle('نهر الأمل') as code \gset
select tests.throws_msg('select public.create_circle(''نهر الأمل'')', 'already_in_circle', 'one circle at a time');
select set_config('request.jwt.claims', json_build_object('sub', :'s2')::text, true);
select public.join_circle(:'code');
select tests.ok(jsonb_array_length(public.my_circle() -> 'members') = 2, 'a friend joins by code');
select tests.ok(public.my_circle() ->> 'goal' = '300', 'the goal grows with the circle');
select tests.ok(tests.count('select * from public.circles') = 1, 'members read their circle');
select public.leave_circle();
select tests.ok(public.my_circle() is null, 'leaving works');
select tests.ok(tests.count('select * from public.circles') = 0, 'non-members cannot read the circle');

select tests.ok(public.monthly_champions() ? 'levels', 'monthly champions answer');
select public.set_avatar('{"face":"round","nested":{"x":1}}');
reset role;
select tests.ok((select avatar from public.profiles where id = :'s2') = '{"face":"round"}'::jsonb, 'avatars keep short strings only');

rollback;
