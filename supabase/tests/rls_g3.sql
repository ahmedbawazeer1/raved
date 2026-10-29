-- Gamification 3: weekly league, duels, role-play points.
\set ON_ERROR_STOP 1
\set QUIET 1
\set pkg `cat content/examples/A1-01.json`
begin;

select tests.create_user('g3-a@example.com', 'سارة أحمد اليافعي') as a \gset
select tests.create_user('g3-b@example.com', 'علي سالم باوزير') as b \gset
select tests.create_user('g3-c@example.com', 'منى خالد') as c \gset
update public.profiles set status = 'active' where id in (:'a', :'b', :'c');
select id as english from public.paths where slug = 'english' \gset
insert into public.enrollments (student_id, path_id, is_primary) values (:'a', :'english', true), (:'b', :'english', true), (:'c', :'english', true);

select public.import_unit_package(:'pkg'::jsonb || '{"roleplay":{"character_ar":"معلم","scenario_en":"Teacher","opening_en":"Hello!"}}') as unit_id \gset
update public.lessons set review_status = 'approved' where unit_id = :'unit_id';
select public.publish_unit(:'unit_id');
select tests.ok((select roleplay ->> 'opening_en' from public.units where id = :'unit_id') = 'Hello!', 'role-play character comes from the package');
-- a and b finished the unit's lessons
insert into public.lesson_progress (student_id, lesson_id, status, completed_at)
select s, l.id, 'completed', now() from public.lessons l, unnest(array[:'a', :'b']::uuid[]) s where l.unit_id = :'unit_id';
insert into public.xp_events (student_id, kind, ref, points) values (:'a', 'lesson', 'x1', 30), (:'b', 'lesson', 'x2', 50), (:'c', 'lesson', 'x3', 70);
update public.profiles set league_opt_in = true where id = :'b';

-- league
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'a')::text, true);
select tests.ok(jsonb_array_length(public.weekly_league('all') -> 'rows') = 2, 'league shows joined students and me only');
select tests.ok((public.weekly_league('all') -> 'me' ->> 'rank')::int = 2, 'my rank among them');
select tests.ok(public.weekly_league('all')::text like '%علي ب.%', 'others appear as first name + initial');
select tests.ok(not (public.weekly_league('all')::text like '%باوزير%'), 'full names never appear');
select tests.ok(not (public.weekly_league('all')::text like '%منى%'), 'students who did not join are hidden');
select public.set_league_opt_in(true);
reset role;
select tests.ok((select league_opt_in from public.profiles where id = :'a'), 'student joins the league');

-- duels
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'c')::text, true);
select tests.throws('select public.create_duel()', 'no duel without learned words');
select set_config('request.jwt.claims', json_build_object('sub', :'a')::text, true);
select public.create_duel() as code \gset
select tests.ok(jsonb_array_length(public.get_duel(:'code') -> 'questions') = 8, 'duel has a question per learned word (max 10)');
select tests.ok(not (public.get_duel(:'code')::text like '%"answer"%'), 'duel questions come without answers');
select tests.ok(tests.count('select * from public.duels') = 0, 'students cannot read the duel table (answer key)');
select tests.ok(public.submit_duel(:'code', '{}'::jsonb, 30000) = 0, 'empty answers score 0');
select tests.throws(format('select public.submit_duel(%L, ''{}'', 1)', :'code'), 'one play per student');
select set_config('request.jwt.claims', json_build_object('sub', :'b')::text, true);
select public.submit_duel(lower(:'code'), '{"0":0,"1":0}'::jsonb, 20000) as bscore \gset
select tests.ok(:'bscore'::int between 0 and 2, 'friend plays with the code');
select tests.ok(jsonb_array_length(public.get_duel(:'code') -> 'players') = 2, 'both results are visible');
select tests.ok(jsonb_array_length(public.my_duels()) = 1, 'friend sees the duel in their list');

-- role-play points
select public.record_roleplay(:'unit_id');
select public.record_roleplay(:'unit_id');
select tests.ok(tests.count('select * from public.xp_events where kind = ''roleplay''') = 1, 'role-play points once per unit');
reset role;
rollback;
