-- Gamification 2: practice games earn points (once per game per day), and later features' point kinds.

alter table public.xp_events drop constraint if exists xp_events_kind_check;
alter table public.xp_events add constraint xp_events_kind_check
  check (kind in ('lesson', 'video', 'quiz', 'quiz_perfect', 'speaking', 'writing', 'vocab', 'certificate', 'game', 'duel', 'story', 'roleplay'));

-- A finished practice game: 5 points, once per game per day (Yemen time).
create or replace function public.record_game(p_game text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_game not in ('flashcards', 'match', 'listen', 'memory', 'speed', 'spell', 'swipe', 'dictation', 'pronounce') then
    raise exception 'unknown_game' using errcode = 'P0001';
  end if;
  perform private.award_xp(v_uid, 'game', p_game || ':' || (now() at time zone 'Asia/Aden')::date, 5);
  return (select count(*) from public.xp_events
           where student_id = v_uid and kind = 'game' and ref like '%:' || (now() at time zone 'Asia/Aden')::date);
end;
$$;

revoke all on function public.record_game(text) from public, anon;
grant execute on function public.record_game(text) to authenticated;
