-- Gamification 3: weekly league (opt-in), friend duels, role-play characters, story points.

-- ---------------------------------------------------------------------------
-- Role-play character of a unit, read from its package (like stop_ar).
-- ---------------------------------------------------------------------------
alter table public.units add column if not exists roleplay jsonb;

create or replace function private.set_unit_stop()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.package ? 'stop_ar' then
    update public.units set stop_ar = nullif(btrim(new.package ->> 'stop_ar'), '') where id = new.unit_id;
  end if;
  if new.package ? 'roleplay' then
    update public.units set roleplay = new.package -> 'roleplay' where id = new.unit_id;
  end if;
  return new;
end;
$$;

-- A role-play conversation (4+ student messages) gives 5 points once per unit.
create or replace function public.record_roleplay(p_unit_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not public.is_active_member() or not private.unit_open(v_uid, p_unit_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform private.award_xp(v_uid, 'roleplay', p_unit_id::text, 5);
end;
$$;

-- ---------------------------------------------------------------------------
-- Weekly league: points earned since Saturday (Yemen time). Only students who joined appear,
-- as first name + initial of the last name. Everyone sees their own rank.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists league_opt_in boolean not null default false;

create or replace function private.week_start()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  -- Saturday 00:00 in Aden (UTC+3).
  select ((date_trunc('day', now() at time zone 'Asia/Aden')
           - make_interval(days => ((extract(dow from now() at time zone 'Asia/Aden')::integer + 1) % 7)))
          at time zone 'Asia/Aden');
$$;

create or replace function private.short_name(p_full text)
returns text
language sql
immutable
set search_path = ''
as $$
  select n[1] || case when cardinality(n) > 1 then ' ' || left(n[cardinality(n)], 1) || '.' else '' end
    from (select regexp_split_to_array(btrim(coalesce(p_full, '')), '\s+') as n) s;
$$;

create or replace function public.set_league_opt_in(p_join boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.profiles set league_opt_in = coalesce(p_join, false) where id = (select auth.uid());
end;
$$;

-- p_scope: 'all' or 'governorate' (the student's own governorate).
create or replace function public.weekly_league(p_scope text default 'all')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_gov text;
  v_since timestamptz := private.week_start();
  v_rows jsonb;
  v_me jsonb;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select governorate into v_gov from public.profiles where id = v_uid;

  with scores as (
    select p.id, p.full_name, p.league_opt_in, coalesce(sum(x.points), 0)::integer as xp
      from public.profiles p
      left join public.xp_events x on x.student_id = p.id and x.created_at >= v_since
     where p.role = 'student' and p.status = 'active'
       and (p.league_opt_in or p.id = v_uid)
       and (p_scope <> 'governorate' or p.governorate is not distinct from v_gov)
     group by p.id
  ), ranked as (
    select *, rank() over (order by xp desc) as rnk from scores
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'rank', rnk, 'xp', xp, 'me', id = v_uid,
           'name', case when id = v_uid then 'أنت' else private.short_name(full_name) end
         ) order by rnk, full_name) filter (where rnk <= 20 or id = v_uid), '[]'::jsonb),
         (select jsonb_build_object('rank', r.rnk, 'xp', r.xp, 'joined', r.league_opt_in) from ranked r where r.id = v_uid)
    into v_rows, v_me
    from ranked;

  return jsonb_build_object('week_start', v_since, 'scope', p_scope, 'rows', v_rows, 'me', v_me);
end;
$$;

-- ---------------------------------------------------------------------------
-- Friend duels: 10 questions on words both can know (A1 words of published units).
-- The answer key stays in the table; students only use the functions below.
-- ---------------------------------------------------------------------------
create table public.duels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  path_id uuid not null references public.paths (id) on delete cascade,
  questions jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.duel_players (
  duel_id uuid not null references public.duels (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  score integer not null check (score between 0 and 10),
  time_ms integer not null check (time_ms between 0 and 3600000),
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (duel_id, student_id)
);
create trigger set_updated_at before update on public.duels for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.duel_players for each row execute function private.set_updated_at();
alter table public.duels enable row level security;
alter table public.duel_players enable row level security;
create policy duels_admin on public.duels for select to authenticated using ((select public.is_admin()));
create policy duel_players_read on public.duel_players for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));

-- Creates a duel from the words of the units the creator has completed lessons in (at least 4 words).
create or replace function public.create_duel()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_path uuid;
  v_words jsonb;
  v_questions jsonb;
  v_code text;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select path_id into v_path from public.enrollments where student_id = v_uid and is_primary;
  select jsonb_agg(jsonb_build_object('word', v.word, 'meaning', v.meaning_ar))
    into v_words
    from (
      select distinct on (lower(v.word)) v.word, v.meaning_ar
        from public.vocab_items v
        join public.units u on u.id = v.unit_id
        join public.levels l on l.id = u.level_id
       where not v.archived and l.path_id = v_path and private.unit_is_live(u.id)
         and exists (select 1 from public.lessons le join public.lesson_progress lp on lp.lesson_id = le.id
                      where le.unit_id = u.id and lp.student_id = v_uid and lp.status = 'completed')
    ) v;
  if coalesce(jsonb_array_length(v_words), 0) < 4 then
    raise exception 'not_enough_words' using errcode = 'P0001';
  end if;

  -- 10 rounds: a word and 4 meanings (one right).
  select jsonb_agg(q) into v_questions from (
    select jsonb_build_object(
             'word', t.w ->> 'word',
             'options', opts.options,
             'answer', (select (ord - 1)::integer from jsonb_array_elements_text(opts.options) with ordinality o(m, ord) where m = t.w ->> 'meaning' limit 1)
           ) as q
      from (select w from jsonb_array_elements(v_words) w order by random() limit 10) t
      cross join lateral (
        select jsonb_agg(m order by random()) as options from (
          select t.w ->> 'meaning' as m
          union
          (select o ->> 'meaning' from jsonb_array_elements(v_words) o
            where o ->> 'meaning' <> t.w ->> 'meaning' order by random() limit 3)
        ) x
      ) opts
  ) s;

  insert into public.duels (creator_id, path_id, questions) values (v_uid, v_path, v_questions) returning code into v_code;
  return v_code;
end;
$$;

-- Questions without answers, plus who played.
create or replace function public.get_duel(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_duel public.duels;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_duel from public.duels where code = upper(btrim(p_code));
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'code', v_duel.code,
    'creator', private.short_name((select full_name from public.profiles where id = v_duel.creator_id)),
    'mine', v_duel.creator_id = v_uid,
    'questions', (select jsonb_agg(jsonb_build_object('word', q ->> 'word', 'options', q -> 'options') order by ord)
                    from jsonb_array_elements(v_duel.questions) with ordinality t(q, ord)),
    'played', exists (select 1 from public.duel_players where duel_id = v_duel.id and student_id = v_uid),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object('name', case when dp.student_id = v_uid then 'أنت' else private.short_name(p.full_name) end,
                                          'score', dp.score, 'time_ms', dp.time_ms, 'me', dp.student_id = v_uid)
                       order by dp.score desc, dp.time_ms)
        from public.duel_players dp join public.profiles p on p.id = dp.student_id
       where dp.duel_id = v_duel.id), '[]'::jsonb)
  );
end;
$$;

-- Grades on the server; one play per student per duel; up to 10 players per duel.
create or replace function public.submit_duel(p_code text, p_answers jsonb, p_time_ms integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_duel public.duels;
  v_score integer := 0;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_duel from public.duels where code = upper(btrim(p_code));
  if not found then
    raise exception 'duel_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.duel_players where duel_id = v_duel.id and student_id = v_uid) then
    raise exception 'already_played' using errcode = 'P0001';
  end if;
  if (select count(*) from public.duel_players where duel_id = v_duel.id) >= 10 then
    raise exception 'duel_full' using errcode = 'P0001';
  end if;

  select count(*) into v_score
    from jsonb_array_elements(v_duel.questions) with ordinality t(q, ord)
   where (p_answers ->> (ord - 1)::text) ~ '^[0-9]$'
     and (p_answers ->> (ord - 1)::text)::integer = (q ->> 'answer')::integer;

  insert into public.duel_players (duel_id, student_id, score, time_ms, answers)
  values (v_duel.id, v_uid, v_score, greatest(0, least(coalesce(p_time_ms, 0), 3600000)), coalesce(p_answers, '{}'::jsonb));
  perform private.award_xp(v_uid, 'duel', v_duel.id::text, 5 + v_score);
  return v_score;
end;
$$;

-- Duels the student created or played (latest first).
create or replace function public.my_duels()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', d.code, 'created_at', d.created_at, 'mine', d.creator_id = (select auth.uid()),
                                               'players', (select count(*) from public.duel_players x where x.duel_id = d.id))
                            order by d.created_at desc), '[]'::jsonb)
    from (select * from public.duels d
           where d.creator_id = (select auth.uid())
              or exists (select 1 from public.duel_players p where p.duel_id = d.id and p.student_id = (select auth.uid()))
           order by d.created_at desc limit 20) d;
$$;

revoke all on function public.record_roleplay(uuid) from public, anon;
grant execute on function public.record_roleplay(uuid) to authenticated;
revoke all on function public.set_league_opt_in(boolean) from public, anon;
grant execute on function public.set_league_opt_in(boolean) to authenticated;
revoke all on function public.weekly_league(text) from public, anon;
grant execute on function public.weekly_league(text) to authenticated;
revoke all on function public.create_duel() from public, anon;
grant execute on function public.create_duel() to authenticated;
revoke all on function public.get_duel(text) from public, anon;
grant execute on function public.get_duel(text) to authenticated;
revoke all on function public.submit_duel(text, jsonb, integer) from public, anon;
grant execute on function public.submit_duel(text, jsonb, integer) to authenticated;
revoke all on function public.my_duels() from public, anon;
grant execute on function public.my_duels() to authenticated;
