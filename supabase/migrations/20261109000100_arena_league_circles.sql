-- «ماء ونمو» (3): the arena (five server-scored games), the water league (tiers, groups of 20,
-- results on Friday), friend circles with a team goal, and monthly champions.
-- Other students are only ever shown as a short name + their avatar.

-- ---------------------------------------------------------------------------
-- Profile: the avatar others see, the league tier, and auto-join (students can opt out).
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists avatar jsonb;
alter table public.profiles add column if not exists league_tier smallint not null default 0;
alter table public.profiles drop constraint if exists profiles_league_tier_check;
alter table public.profiles add constraint profiles_league_tier_check check (league_tier between 0 and 5);
alter table public.profiles drop constraint if exists profiles_avatar_check;
alter table public.profiles add constraint profiles_avatar_check
  check (avatar is null or (jsonb_typeof(avatar) = 'object' and pg_column_size(avatar) < 1024));
alter table public.profiles alter column league_opt_in set default true;
-- Owner decision (2026-11-09): everyone joins the league; students opt out in their settings.
update public.profiles set league_opt_in = true where role = 'student' and not league_opt_in;

-- The avatar is drawn by the apps from these keys only (parseAvatar on read); stored for others to see.
create or replace function public.set_avatar(p_avatar jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_avatar is null or jsonb_typeof(p_avatar) <> 'object' or pg_column_size(p_avatar) >= 1024 then
    raise exception 'invalid_avatar' using errcode = 'P0001';
  end if;
  -- Keep short string values only (no nested data).
  update public.profiles
     set avatar = (select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from jsonb_each(p_avatar) e(k, v)
                    where jsonb_typeof(v) = 'string' and length(k) <= 20 and length(v #>> '{}') <= 20)
   where id = (select auth.uid());
end;
$$;

alter table public.xp_events drop constraint if exists xp_events_kind_check;
alter table public.xp_events add constraint xp_events_kind_check
  check (kind in ('lesson', 'video', 'quiz', 'quiz_perfect', 'speaking', 'writing', 'vocab', 'certificate', 'game', 'duel', 'story', 'roleplay', 'arena'));

-- The level a student is studying now: the level of their latest completed lesson (A1 before any).
create or replace function private.student_level(p_uid uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select l.code from public.lesson_progress lp
      join public.lessons le on le.id = lp.lesson_id
      join public.units u on u.id = le.unit_id
      join public.levels l on l.id = u.level_id
     where lp.student_id = p_uid and lp.status = 'completed'
     order by lp.completed_at desc nulls last limit 1), 'A1');
$$;

-- ---------------------------------------------------------------------------
-- Water league: ينبوع(0) ← جدول ← نهر ← بحيرة ← بحر ← محيط(5).
-- Week = Saturday 00:00 → Friday 00:00 (Aden). Results on Friday (the rest day).
-- Top 5 go up; bottom 5 go down, never from the first two tiers.
-- ---------------------------------------------------------------------------
create table public.league_groups (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  tier smallint not null check (tier between 0 and 5),
  settled_at timestamptz,
  created_at timestamptz not null default now()
);
create index league_groups_open on public.league_groups (starts_at, tier) where settled_at is null;

create table public.league_members (
  group_id uuid not null references public.league_groups (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  joined_at timestamptz not null default now(),
  final_rank integer,
  final_xp integer,
  outcome text check (outcome in ('up', 'stay', 'down')),
  seen_at timestamptz,
  primary key (group_id, student_id),
  unique (student_id, starts_at)
);
create index league_members_student on public.league_members (student_id, starts_at desc);

alter table public.league_groups enable row level security;
alter table public.league_members enable row level security;
create policy league_groups_admin on public.league_groups for select to authenticated using ((select public.is_admin()));
create policy league_members_own on public.league_members for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));

-- Settles every finished week (Friday 00:00 has passed): ranks, outcomes and the new tiers.
create or replace function private.league_settle_due()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  g record;
begin
  for g in select id, tier, starts_at from public.league_groups
            where settled_at is null and now() >= starts_at + interval '6 days'
            order by starts_at for update skip locked loop
    with scores as (
      select m.student_id, m.joined_at,
             coalesce((select sum(x.points) from public.xp_events x
                        where x.student_id = m.student_id and x.created_at >= g.starts_at
                          and x.created_at < g.starts_at + interval '6 days'), 0)::integer as xp
        from public.league_members m where m.group_id = g.id
    ), ranked as (
      select *, row_number() over (order by xp desc, joined_at) as rnk, count(*) over () as n from scores
    )
    update public.league_members m
       set final_rank = r.rnk, final_xp = r.xp,
           outcome = case
             when r.rnk <= 5 and r.xp > 0 and g.tier < 5 then 'up'
             when g.tier >= 2 and r.rnk > greatest(r.n - 5, 5) then 'down'
             else 'stay' end
      from ranked r
     where m.group_id = g.id and m.student_id = r.student_id;

    update public.profiles p
       set league_tier = least(5, greatest(0, g.tier + case m.outcome when 'up' then 1 when 'down' then -1 else 0 end))
      from public.league_members m
     where m.group_id = g.id and m.student_id = p.id;

    update public.league_groups set settled_at = now() where id = g.id;
  end loop;
end;
$$;

-- Puts an opted-in active student in this week's group of their tier (at most 20 per group).
create or replace function private.league_join(p_uid uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start timestamptz := private.week_start();
  v_group uuid;
  v_tier smallint;
begin
  select group_id into v_group from public.league_members where student_id = p_uid and starts_at = v_start;
  if v_group is not null then
    return v_group;
  end if;
  if not exists (select 1 from public.profiles where id = p_uid and role = 'student' and status = 'active' and league_opt_in) then
    return null;
  end if;
  perform private.league_settle_due();
  select league_tier into v_tier from public.profiles where id = p_uid;
  perform pg_advisory_xact_lock(hashtext('league:' || v_start::text || ':' || v_tier::text));
  select g.id into v_group from public.league_groups g
   where g.starts_at = v_start and g.tier = v_tier
     and (select count(*) from public.league_members m where m.group_id = g.id) < 20
   order by g.created_at limit 1;
  if v_group is null then
    insert into public.league_groups (starts_at, tier) values (v_start, v_tier) returning id into v_group;
  end if;
  insert into public.league_members (group_id, student_id, starts_at) values (v_group, p_uid, v_start)
    on conflict (student_id, starts_at) do nothing;
  return (select group_id from public.league_members where student_id = p_uid and starts_at = v_start);
end;
$$;

-- Earning drops puts the student in this week's group (only active students fill the groups).
create or replace function private.league_on_xp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.league_join(new.student_id);
  return null;
end;
$$;
drop trigger if exists league_on_xp on public.xp_events;
create trigger league_on_xp after insert on public.xp_events for each row execute function private.league_on_xp();

create or replace function public.set_league_opt_in(p_join boolean)
returns void
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
  update public.profiles set league_opt_in = coalesce(p_join, false) where id = v_uid;
  if not coalesce(p_join, false) then
    -- Leaving takes the student out of this week's (unsettled) group.
    delete from public.league_members m using public.league_groups g
     where m.group_id = g.id and m.student_id = v_uid and g.settled_at is null;
  end if;
end;
$$;

-- The student's group this week. Keeps the old shape (rows, me) for older app versions.
-- p_scope is ignored (groups replaced the all/governorate boards).
drop function if exists public.weekly_league(text);
create function public.weekly_league(p_scope text default 'all')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_start timestamptz := private.week_start();
  v_group uuid;
  v_tier smallint;
  v_joined boolean;
  v_settled boolean := false;
  v_rows jsonb := '[]'::jsonb;
  v_me jsonb;
  v_result jsonb;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform private.league_settle_due();
  select league_opt_in into v_joined from public.profiles where id = v_uid;
  v_group := private.league_join(v_uid);
  select league_tier into v_tier from public.profiles where id = v_uid;

  if v_group is not null then
    select g.settled_at is not null, g.tier into v_settled, v_tier from public.league_groups g where g.id = v_group;
    with scores as (
      select m.student_id, m.joined_at, p.full_name, p.avatar,
             coalesce(m.final_xp, (select sum(x.points) from public.xp_events x
                                    where x.student_id = m.student_id and x.created_at >= v_start
                                      and x.created_at < v_start + interval '6 days'), 0)::integer as xp
        from public.league_members m join public.profiles p on p.id = m.student_id
       where m.group_id = v_group
    ), ranked as (
      select *, row_number() over (order by xp desc, joined_at) as rnk from scores
    )
    select coalesce(jsonb_agg(jsonb_build_object(
             'rank', rnk, 'xp', xp, 'me', student_id = v_uid, 'avatar', avatar,
             'name', case when student_id = v_uid then 'أنت' else private.short_name(full_name) end
           ) order by rnk), '[]'::jsonb),
           (select jsonb_build_object('rank', r.rnk, 'xp', r.xp, 'joined', true, 'tier', v_tier) from ranked r where r.student_id = v_uid)
      into v_rows, v_me
      from ranked;
  end if;
  if v_me is null then
    v_me := jsonb_build_object('rank', null, 'xp', 0, 'joined', coalesce(v_joined, false), 'tier', v_tier);
  end if;

  -- The latest announced result the student has not seen yet.
  select jsonb_build_object('starts_at', m.starts_at, 'outcome', m.outcome, 'rank', m.final_rank, 'xp', m.final_xp,
                            'from_tier', g.tier, 'to_tier', least(5, greatest(0, g.tier + case m.outcome when 'up' then 1 when 'down' then -1 else 0 end)))
    into v_result
    from public.league_members m join public.league_groups g on g.id = m.group_id
   where m.student_id = v_uid and m.outcome is not null and m.seen_at is null
   order by m.starts_at desc limit 1;

  return jsonb_build_object(
    'week_start', v_start, 'ends_at', v_start + interval '6 days', 'settled', v_settled, 'tier', v_tier,
    'rows', v_rows, 'me', v_me, 'result', v_result);
end;
$$;

create or replace function public.league_result_seen()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.league_members set seen_at = now()
   where student_id = (select auth.uid()) and outcome is not null and seen_at is null;
$$;

-- ---------------------------------------------------------------------------
-- Arena: five games built in the database from the words of units the student studied.
-- The answer key never leaves the database before the run is submitted.
-- drops = سباق القطرات, bridge = جسر الكلمات, net = شبكة الصيّاد, errors = صيّاد الأخطاء, echo = صدى الوادي.
-- ---------------------------------------------------------------------------
create table public.arena_runs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (game in ('drops', 'bridge', 'net', 'errors', 'echo')),
  mode text not null check (mode in ('bot', 'online')),
  level_code text not null,
  questions jsonb not null,
  answer_key jsonb not null,
  opponent jsonb not null,
  -- index → {"a": answer, "ok": bool, "t": ms since the start}; written by arena_answer() only.
  answers jsonb not null default '{}'::jsonb,
  score integer,
  total integer not null,
  timeline jsonb,
  won boolean,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index arena_runs_student on public.arena_runs (student_id, created_at desc);
create index arena_runs_ghosts on public.arena_runs (game, level_code, finished_at desc) where finished_at is not null;
alter table public.arena_runs enable row level security;
-- Students use the functions only (the key is in the row).
create policy arena_runs_admin on public.arena_runs for select to authenticated using ((select public.is_admin()));

create or replace function private.arena_norm(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(regexp_replace(lower(coalesce(p, '')), '[^a-z0-9'' ]+', ' ', 'g'), '\s+', ' ', 'g'));
$$;

create or replace function public.arena_start(p_game text, p_mode text default 'bot')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_path uuid;
  v_level text;
  v_words jsonb;
  v_sentences jsonb;
  v_q jsonb;
  v_key jsonb;
  v_total integer;
  v_opp jsonb;
  v_id uuid;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_game not in ('drops', 'bridge', 'net', 'errors', 'echo') or p_mode not in ('bot', 'online') then
    raise exception 'unknown_game' using errcode = 'P0001';
  end if;
  if (select count(*) from public.arena_runs where student_id = v_uid and created_at > now() - interval '1 day') >= 60 then
    raise exception 'too_many_runs' using errcode = 'P0001';
  end if;
  select path_id into v_path from public.enrollments where student_id = v_uid and is_primary;
  v_level := private.student_level(v_uid);

  -- Words (and their example sentences) of the units the student has completed lessons in.
  select coalesce(jsonb_agg(jsonb_build_object('word', v.word, 'meaning', v.meaning_ar, 'example', v.example_en)), '[]'::jsonb)
    into v_words
    from (
      select distinct on (lower(v.word)) v.word, v.meaning_ar, v.example_en
        from public.vocab_items v
        join public.units u on u.id = v.unit_id
        join public.levels l on l.id = u.level_id
       where not v.archived and l.path_id = v_path and private.unit_is_live(u.id)
         and exists (select 1 from public.lessons le join public.lesson_progress lp on lp.lesson_id = le.id
                      where le.unit_id = u.id and lp.student_id = v_uid and lp.status = 'completed')
    ) v;
  select coalesce(jsonb_agg(distinct btrim(w ->> 'example')), '[]'::jsonb) into v_sentences
    from jsonb_array_elements(v_words) w
   where cardinality(regexp_split_to_array(btrim(w ->> 'example'), '\s+')) between 3 and 9;

  if p_game in ('drops', 'net') then
    if jsonb_array_length(v_words) < (case p_game when 'net' then 6 else 4 end) then
      raise exception 'not_enough_words' using errcode = 'P0001';
    end if;
    -- drops: an English word and 4 Arabic meanings. net: an Arabic meaning and 6 floating English words.
    select jsonb_agg(jsonb_build_object('prompt', q.prompt, 'options', q.options) order by q.n),
           jsonb_agg(to_jsonb(q.answer::text) order by q.n)
      into v_q, v_key
      from (
        select t.n,
               case p_game when 'drops' then t.w ->> 'word' else t.w ->> 'meaning' end as prompt,
               opts.options,
               (select (ord - 1)::integer from jsonb_array_elements_text(opts.options) with ordinality o(m, ord)
                 where m = t.w ->> (case p_game when 'drops' then 'meaning' else 'word' end) limit 1) as answer
          from (select w, row_number() over () as n
                  from (select w from jsonb_array_elements(v_words) w order by random()
                         limit case p_game when 'drops' then 10 else 6 end) s) t
          cross join lateral (
            select jsonb_agg(m order by random()) as options from (
              select t.w ->> (case p_game when 'drops' then 'meaning' else 'word' end) as m
              union
              (select o ->> (case p_game when 'drops' then 'meaning' else 'word' end) from jsonb_array_elements(v_words) o
                where o ->> 'word' <> t.w ->> 'word' order by random() limit case p_game when 'drops' then 3 else 5 end)
            ) x
          ) opts
      ) q;
  else
    if jsonb_array_length(v_sentences) < 3 or (p_game = 'errors' and jsonb_array_length(v_words) < 4) then
      raise exception 'not_enough_words' using errcode = 'P0001';
    end if;
    if p_game = 'bridge' then
      -- The sentence's words shuffled; the answer is the sentence.
      select jsonb_agg(jsonb_build_object('tiles', (select jsonb_agg(tok order by random())
                                                    from unnest(regexp_split_to_array(s.t, '\s+')) tok)) order by s.n),
             jsonb_agg(to_jsonb(s.t) order by s.n)
        into v_q, v_key
        from (select t #>> '{}' as t, row_number() over () as n
                from (select t from jsonb_array_elements(v_sentences) t order by random() limit 6) r) s;
    elsif p_game = 'echo' then
      -- The sentence is spoken by the device (so the client has it); the student types it.
      select jsonb_agg(jsonb_build_object('say', s.t) order by s.n),
             jsonb_agg(to_jsonb(s.t) order by s.n)
        into v_q, v_key
        from (select t #>> '{}' as t, row_number() over () as n
                from (select t from jsonb_array_elements(v_sentences) t order by random() limit 6) r) s;
    else
      -- errors: one word of the sentence is swapped for another learned word; the answer is its index.
      select jsonb_agg(jsonb_build_object('words', e.words) order by e.n), jsonb_agg(to_jsonb(e.idx::text) order by e.n)
        into v_q, v_key
        from (
          select s.n, pick.idx,
                 (select jsonb_agg(case when o.ord - 1 = pick.idx then rep.word || coalesce(substring(o.tok from '[^A-Za-z'']*$'), '') else o.tok end order by o.ord)
                    from unnest(s.toks) with ordinality o(tok, ord)) as words
            from (select regexp_split_to_array(t #>> '{}', '\s+') as toks, row_number() over () as n
                    from (select t from jsonb_array_elements(v_sentences) t order by random() limit 6) r) s
            cross join lateral (
              select (o.ord - 1)::integer as idx from unnest(s.toks) with ordinality o(tok, ord)
               where length(regexp_replace(o.tok, '[^A-Za-z]', '', 'g')) >= 3 order by random() limit 1
            ) pick
            cross join lateral (
              select w ->> 'word' as word from jsonb_array_elements(v_words) w
               where lower(w ->> 'word') <> all (select lower(regexp_replace(x, '[^A-Za-z'']', '', 'g')) from unnest(s.toks) x)
                 and w ->> 'word' !~ '\s'
               order by random() limit 1
            ) rep
        ) e;
    end if;
  end if;
  v_total := coalesce(jsonb_array_length(v_key), 0);
  if v_total < 3 then
    raise exception 'not_enough_words' using errcode = 'P0001';
  end if;

  -- Online: a real earlier run of another student at the same level (short name + avatar, league members only).
  -- Nobody yet: a bot at the student's level.
  if p_mode = 'online' then
    select jsonb_build_object('kind', 'ghost', 'name', private.short_name(p.full_name), 'avatar', p.avatar,
                              'score', least(r.score, v_total), 'timeline', r.timeline)
      into v_opp
      from public.arena_runs r join public.profiles p on p.id = r.student_id
     where r.game = p_game and r.level_code = v_level and r.student_id <> v_uid and r.finished_at is not null
       and r.finished_at > now() - interval '60 days' and p.league_opt_in and p.status = 'active'
       and r.timeline is not null
     order by random() limit 1;
  end if;
  if v_opp is null then
    -- A bot that gets 45–85% right, 2.6–4.8 s per question.
    with skill as (select 0.45 + random() * 0.4 as p),
    steps as (
      select i, (2600 + floor(random() * 2200))::integer as d, random() < (select p from skill) as ok
        from generate_series(1, v_total) i
    ), timeline as (
      select i, sum(d) over (order by i) as t, ok from steps
    )
    select jsonb_build_object('kind', 'bot', 'name', 'قطرة', 'avatar', null, 'fallback', p_mode = 'online',
                              'score', (select count(*) from timeline where ok),
                              'timeline', (select jsonb_agg(jsonb_build_object('t', t, 'ok', ok) order by i) from timeline))
      into v_opp;
  end if;

  insert into public.arena_runs (student_id, game, mode, level_code, questions, answer_key, opponent, total)
  values (v_uid, p_game, p_mode, v_level, v_q, v_key, v_opp, v_total)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'game', p_game, 'questions', v_q, 'total', v_total, 'opponent', v_opp, 'level', v_level);
end;
$$;

-- One answer, graded at once (the right answer is revealed only after answering). Times are the server's.
create or replace function public.arena_answer(p_run uuid, p_index integer, p_answer text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_run public.arena_runs;
  v_ok boolean;
  v_t integer;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_run from public.arena_runs where id = p_run and student_id = v_uid for update;
  if v_run.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if v_run.finished_at is not null or now() > v_run.created_at + interval '30 minutes' then
    raise exception 'already_finished' using errcode = 'P0001';
  end if;
  if p_index is null or p_index < 0 or p_index >= v_run.total then
    raise exception 'invalid_answers' using errcode = 'P0001';
  end if;
  if v_run.answers ? p_index::text then
    raise exception 'already_answered' using errcode = 'P0001';
  end if;
  v_ok := private.arena_norm(v_run.answer_key ->> p_index) = private.arena_norm(left(coalesce(p_answer, ''), 300));
  -- Matching + countdown take about 4 s before the first question.
  v_t := greatest(300, (extract(epoch from now() - v_run.created_at) * 1000)::integer - 4000);
  update public.arena_runs
     set answers = answers || jsonb_build_object(p_index::text, jsonb_build_object('a', left(coalesce(p_answer, ''), 300), 'ok', v_ok, 't', v_t))
   where id = p_run;
  return jsonb_build_object('ok', v_ok, 'answer', v_run.answer_key ->> p_index, 't', v_t);
end;
$$;

-- Closes a run: unanswered questions count as wrong. 5 drops for at least half right, once per game per day.
create or replace function public.arena_finish(p_run uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_run public.arena_runs;
  v_score integer;
  v_timeline jsonb;
  v_opp integer;
  v_won boolean;
  v_before integer;
  v_after integer;
  v_day text := ((now() at time zone 'Asia/Aden')::date)::text;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_run from public.arena_runs where id = p_run and student_id = v_uid for update;
  if v_run.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if v_run.finished_at is not null then
    raise exception 'already_finished' using errcode = 'P0001';
  end if;

  select count(*) filter (where (v ->> 'ok')::boolean) into v_score from jsonb_each(v_run.answers) e(k, v);
  -- The timeline others race against (answered questions, in time order).
  select jsonb_agg(jsonb_build_object('t', (v ->> 't')::integer, 'ok', (v ->> 'ok')::boolean) order by (v ->> 't')::integer)
    into v_timeline
    from jsonb_each(v_run.answers) e(k, v);
  v_opp := coalesce((v_run.opponent ->> 'score')::integer, 0);
  v_won := v_score > v_opp
           or (v_score = v_opp and v_score > 0
               and coalesce((v_timeline -> -1 ->> 't')::integer, 0) <= coalesce((v_run.opponent -> 'timeline' -> -1 ->> 't')::integer, 0));

  update public.arena_runs set score = v_score, timeline = v_timeline, won = v_won, finished_at = now() where id = p_run;

  select coalesce(sum(points), 0) into v_before from public.xp_events where student_id = v_uid and kind = 'arena' and ref like '%:' || v_day;
  if v_score * 2 >= v_run.total then
    perform private.award_xp(v_uid, 'arena', v_run.game || ':' || v_day, 5);
  end if;
  select coalesce(sum(points), 0) into v_after from public.xp_events where student_id = v_uid and kind = 'arena' and ref like '%:' || v_day;

  return jsonb_build_object('score', v_score, 'total', v_run.total, 'answers', v_run.answer_key,
                            'opponent_score', v_opp, 'won', v_won, 'drops', v_after - v_before, 'drops_today', v_after);
end;
$$;

-- Today's arena drops per game (max 5 each).
create or replace function public.arena_today()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(split_part(ref, ':', 1), points), '{}'::jsonb)
    from public.xp_events
   where student_id = (select auth.uid()) and kind = 'arena'
     and ref like '%:' || ((now() at time zone 'Asia/Aden')::date)::text;
$$;

-- ---------------------------------------------------------------------------
-- Circles: a room with a code; a shared weekly goal that fills like a lake. No ranking inside.
-- ---------------------------------------------------------------------------
create table public.circles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  name text not null check (name in ('نهر الأمل', 'جدول المجتهدين', 'ينبوع المعرفة', 'بحيرة النجوم', 'وادي الهمم', 'شلال الأبطال')),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.circle_members (
  circle_id uuid not null references public.circles (id) on delete cascade,
  student_id uuid not null unique references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (circle_id, student_id)
);
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
create policy circles_member on public.circles for select to authenticated
  using (exists (select 1 from public.circle_members m where m.circle_id = circles.id and m.student_id = (select auth.uid()))
         or (select public.is_admin()));
create policy circle_members_own on public.circle_members for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));

create or replace function public.create_circle(p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_code text;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if exists (select 1 from public.circle_members where student_id = v_uid) then
    raise exception 'already_in_circle' using errcode = 'P0001';
  end if;
  insert into public.circles (name, owner_id) values (p_name, v_uid) returning id, code into v_id, v_code;
  insert into public.circle_members (circle_id, student_id) values (v_id, v_uid);
  return v_code;
end;
$$;

create or replace function public.join_circle(p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select id into v_id from public.circles where code = upper(btrim(coalesce(p_code, '')));
  if v_id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.circle_members where student_id = v_uid) then
    raise exception 'already_in_circle' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('circle:' || v_id::text));
  if (select count(*) from public.circle_members where circle_id = v_id) >= 10 then
    raise exception 'circle_full' using errcode = 'P0001';
  end if;
  insert into public.circle_members (circle_id, student_id) values (v_id, v_uid);
end;
$$;

create or replace function public.leave_circle()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_circle uuid;
begin
  if v_uid is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.circle_members where student_id = v_uid returning circle_id into v_circle;
  if v_circle is not null and not exists (select 1 from public.circle_members where circle_id = v_circle) then
    delete from public.circles where id = v_circle;
  end if;
end;
$$;

-- The student's circle: members (short name + avatar, no numbers each), this week's total and goal.
create or replace function public.my_circle()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_circle public.circles;
  v_start timestamptz := private.week_start();
  v_members jsonb;
  v_total integer;
  v_n integer;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select c.* into v_circle from public.circles c join public.circle_members m on m.circle_id = c.id where m.student_id = v_uid;
  if v_circle.id is null then
    return null;
  end if;
  select jsonb_agg(jsonb_build_object('name', case when p.id = v_uid then 'أنت' else private.short_name(p.full_name) end,
                                      'avatar', p.avatar, 'me', p.id = v_uid,
                                      'active', exists (select 1 from public.xp_events x where x.student_id = p.id and x.created_at >= v_start))
                   order by m.joined_at),
         count(*)
    into v_members, v_n
    from public.circle_members m join public.profiles p on p.id = m.student_id
   where m.circle_id = v_circle.id;
  select coalesce(sum(x.points), 0) into v_total
    from public.xp_events x join public.circle_members m on m.student_id = x.student_id
   where m.circle_id = v_circle.id and x.created_at >= v_start;
  return jsonb_build_object('name', v_circle.name, 'code', v_circle.code, 'owner', v_circle.owner_id = v_uid,
                            'members', v_members, 'total', v_total, 'goal', 150 * v_n);
end;
$$;

-- ---------------------------------------------------------------------------
-- Monthly champions (last month, per level): most drops, most watered days, arena champion.
-- League members only (they agreed to appear to others).
-- ---------------------------------------------------------------------------
create or replace function public.monthly_champions()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_to timestamptz := (date_trunc('month', now() at time zone 'Asia/Aden')) at time zone 'Asia/Aden';
  v_from timestamptz := (date_trunc('month', now() at time zone 'Asia/Aden') - interval '1 month') at time zone 'Asia/Aden';
  v_out jsonb;
begin
  if (select auth.uid()) is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  with people as (
    select p.id, p.full_name, p.avatar, private.student_level(p.id) as level,
           (select coalesce(sum(x.points), 0) from public.xp_events x where x.student_id = p.id and x.created_at >= v_from and x.created_at < v_to) as drops,
           (select count(distinct (x.created_at at time zone 'Asia/Aden')::date) from public.xp_events x
             where x.student_id = p.id and x.created_at >= v_from and x.created_at < v_to) as days,
           (select count(*) from public.arena_runs r where r.student_id = p.id and r.won and r.finished_at >= v_from and r.finished_at < v_to) as wins
      from public.profiles p
     where p.role = 'student' and p.status = 'active' and p.league_opt_in
       and exists (select 1 from public.xp_events x where x.student_id = p.id and x.created_at >= v_from and x.created_at < v_to)
  ), titles as (
    select level, 'drops' as title, (array_agg(jsonb_build_object('name', private.short_name(full_name), 'avatar', avatar, 'value', drops) order by drops desc, id))[1] as who
      from people where drops > 0 group by level
    union all
    select level, 'watering', (array_agg(jsonb_build_object('name', private.short_name(full_name), 'avatar', avatar, 'value', days) order by days desc, drops desc, id))[1]
      from people where days > 0 group by level
    union all
    select level, 'arena', (array_agg(jsonb_build_object('name', private.short_name(full_name), 'avatar', avatar, 'value', wins) order by wins desc, drops desc, id))[1]
      from people where wins > 0 group by level
  )
  select coalesce(jsonb_object_agg(level, t), '{}'::jsonb) into v_out
    from (select level, jsonb_object_agg(title, who) as t from titles group by level) s;
  return jsonb_build_object('month', to_char(v_from at time zone 'Asia/Aden', 'YYYY-MM'), 'levels', v_out);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on function public.set_avatar(jsonb) from public, anon;
grant execute on function public.set_avatar(jsonb) to authenticated;
revoke all on function public.weekly_league(text) from public, anon;
grant execute on function public.weekly_league(text) to authenticated;
revoke all on function public.league_result_seen() from public, anon;
grant execute on function public.league_result_seen() to authenticated;
revoke all on function public.arena_start(text, text) from public, anon;
grant execute on function public.arena_start(text, text) to authenticated;
revoke all on function public.arena_answer(uuid, integer, text) from public, anon;
grant execute on function public.arena_answer(uuid, integer, text) to authenticated;
revoke all on function public.arena_finish(uuid) from public, anon;
grant execute on function public.arena_finish(uuid) to authenticated;
revoke all on function public.arena_today() from public, anon;
grant execute on function public.arena_today() to authenticated;
revoke all on function public.create_circle(text) from public, anon;
grant execute on function public.create_circle(text) to authenticated;
revoke all on function public.join_circle(text) from public, anon;
grant execute on function public.join_circle(text) to authenticated;
revoke all on function public.leave_circle() from public, anon;
grant execute on function public.leave_circle() to authenticated;
revoke all on function public.my_circle() from public, anon;
grant execute on function public.my_circle() to authenticated;
revoke all on function public.monthly_champions() from public, anon;
grant execute on function public.monthly_champions() to authenticated;

-- Students edit their own profile row, but never their league tier (only the weekly results move it).
create or replace function private.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_privileged_session() or public.is_admin() then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.email is distinct from old.email
     or new.streak_days is distinct from old.streak_days
     or new.league_tier is distinct from old.league_tier
     or new.created_at is distinct from old.created_at then
    raise exception 'forbidden_profile_change' using errcode = '42501';
  end if;
  return new;
end;
$$;
