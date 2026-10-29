-- Gamification 2: practice games give points once per game per day.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;

select tests.create_user('g2-student@example.com', 'طالب') as st \gset
select tests.create_user('g2-pending@example.com', 'معلّق') as pe \gset
update public.profiles set status = 'active' where id = :'st';

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st')::text, true);
select tests.ok(public.record_game('memory') = 1, 'a finished game is counted');
select tests.ok(public.record_game('memory') = 1, 'the same game twice a day counts once');
select tests.ok(public.record_game('speed') = 2, 'another game counts too');
select tests.ok((select sum(points) from public.xp_events) = 10, '5 points per game per day');
select tests.throws('select public.record_game(''hack'')', 'unknown game is refused');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'pe')::text, true);
select tests.throws('select public.record_game(''memory'')', 'pending student cannot earn points');
reset role;
rollback;
