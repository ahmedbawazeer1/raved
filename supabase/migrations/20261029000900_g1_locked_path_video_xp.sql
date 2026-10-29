-- Gamification 1: a locked learning path, mandatory videos, points (XP) and journey stops.
-- Owner decision (2026-10-29): everything is mandatory, in order, and every video must be watched.

-- ---------------------------------------------------------------------------
-- Journey map: each unit is a stop (e.g. «المكلا»), read from its package.
-- ---------------------------------------------------------------------------
alter table public.units add column if not exists stop_ar text;

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
  return new;
end;
$$;

create trigger unit_packages_stop after insert on public.unit_packages
  for each row execute function private.set_unit_stop();

-- ---------------------------------------------------------------------------
-- Points. Rows are written only by the functions and triggers below.
-- ---------------------------------------------------------------------------
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('lesson', 'video', 'quiz', 'quiz_perfect', 'speaking', 'writing', 'vocab', 'certificate')),
  ref text not null,
  points integer not null check (points between 0 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, kind, ref)
);
create index xp_events_student_idx on public.xp_events (student_id, created_at);
create trigger set_updated_at before update on public.xp_events for each row execute function private.set_updated_at();
alter table public.xp_events enable row level security;
create policy xp_events_read on public.xp_events for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));

create or replace function private.award_xp(p_uid uuid, p_kind text, p_ref text, p_points integer)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.xp_events (student_id, kind, ref, points) values (p_uid, p_kind, p_ref, p_points)
  on conflict (student_id, kind, ref) do nothing;
$$;

-- ---------------------------------------------------------------------------
-- Videos: how much of each YouTube video the student really watched.
-- ---------------------------------------------------------------------------
create table public.video_views (
  student_id uuid not null references public.profiles (id) on delete cascade,
  youtube_id text not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  duration_sec integer not null check (duration_sec > 0),
  watched_sec integer not null default 0 check (watched_sec >= 0),
  first_seen_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, youtube_id)
);
create trigger set_updated_at before update on public.video_views for each row execute function private.set_updated_at();
alter table public.video_views enable row level security;
create policy video_views_read on public.video_views for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));

-- A video counts as watched at 80% of its length.
create or replace function private.video_done(p_watched integer, p_duration integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_watched >= ceil(p_duration * 0.8);
$$;

-- Length of a video as written in the published content (the client is not trusted for it).
create or replace function private.video_duration(p_youtube_id text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select max((b ->> 'duration_sec')::integer)
    from public.lessons le, jsonb_array_elements(le.blocks) b
   where b ->> 'type' = 'video' and b ->> 'youtube_id' = p_youtube_id
     and (b ->> 'duration_sec') ~ '^[0-9]+$'
     and not le.archived and private.unit_is_live(le.unit_id);
$$;

-- Called every few seconds while the video plays. p_watched_sec = seconds actually played (no skipping).
-- The server caps it by the time since the student first opened the video (×2 for fast playback).
create or replace function public.record_video_watch(p_youtube_id text, p_watched_sec integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_duration integer;
  v_row public.video_views;
  v_allowed integer;
  v_watched integer;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_duration := private.video_duration(p_youtube_id);
  if v_duration is null then
    raise exception 'video_not_found' using errcode = 'P0002';
  end if;

  insert into public.video_views (student_id, youtube_id, duration_sec) values (v_uid, p_youtube_id, v_duration)
  on conflict (student_id, youtube_id) do nothing;
  select * into v_row from public.video_views where student_id = v_uid and youtube_id = p_youtube_id;

  v_allowed := least(v_duration, floor(extract(epoch from (now() - v_row.first_seen_at)) * 2)::integer + 15);
  v_watched := greatest(v_row.watched_sec, least(greatest(coalesce(p_watched_sec, 0), 0), v_allowed));

  update public.video_views
     set watched_sec = v_watched,
         duration_sec = v_duration,
         completed_at = coalesce(completed_at, case when private.video_done(v_watched, v_duration) then now() end)
   where student_id = v_uid and youtube_id = p_youtube_id
  returning * into v_row;

  if v_row.completed_at is not null then
    perform private.award_xp(v_uid, 'video', p_youtube_id, 5);
  end if;
  return jsonb_build_object('watched_sec', v_row.watched_sec, 'duration_sec', v_row.duration_sec, 'done', v_row.completed_at is not null);
end;
$$;

-- ---------------------------------------------------------------------------
-- The locked path. A unit opens when every earlier unit (from the placement start unit) is passed.
-- ---------------------------------------------------------------------------
create or replace function private.unit_passed(p_uid uuid, p_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.quizzes q where q.unit_id = p_unit_id and q.kind = 'unit') then exists (
      select 1 from public.quizzes q join public.quiz_attempts a on a.quiz_id = q.id
       where q.unit_id = p_unit_id and q.kind = 'unit' and a.student_id = p_uid and a.passed)
    else not exists (
      select 1 from public.lessons le
       where le.unit_id = p_unit_id and not le.archived
         and not exists (select 1 from public.lesson_progress lp where lp.lesson_id = le.id and lp.student_id = p_uid and lp.status = 'completed'))
  end;
$$;

create or replace function private.unit_open(p_uid uuid, p_unit_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_path uuid;
  v_kind text;
  v_lvl integer;
  v_pos integer;
  v_start_lvl integer;
  v_start_pos integer;
begin
  if not private.unit_is_live(p_unit_id) then
    return false;
  end if;
  select l.path_id, l.kind, l.position, u.position into v_path, v_kind, v_lvl, v_pos
    from public.units u join public.levels l on l.id = u.level_id where u.id = p_unit_id;
  if v_kind <> 'general' then
    return true; -- the exam track has its own gate (B1+)
  end if;

  select sl.position, su.position into v_start_lvl, v_start_pos
    from public.enrollments e
    join public.units su on su.id = e.start_unit_id
    join public.levels sl on sl.id = su.level_id
   where e.student_id = p_uid and e.path_id = v_path;
  -- Units before the placement start unit stay open for optional review.
  if v_start_lvl is not null and (v_lvl, v_pos) < (v_start_lvl, v_start_pos) then
    return true;
  end if;

  return not exists (
    select 1 from public.units u2 join public.levels l2 on l2.id = u2.level_id
     where l2.path_id = v_path and l2.kind = 'general' and u2.status = 'published'
       and (l2.position, u2.position) < (v_lvl, v_pos)
       and (v_start_lvl is null or (l2.position, u2.position) >= (v_start_lvl, v_start_pos))
       and not private.unit_passed(p_uid, u2.id)
  );
end;
$$;

-- A lesson opens when its unit is open and every earlier lesson of the unit is completed.
create or replace function private.lesson_open(p_uid uuid, p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.lessons le
     where le.id = p_lesson_id and not le.archived and private.unit_open(p_uid, le.unit_id)
       and not exists (
         select 1 from public.lessons prev
          where prev.unit_id = le.unit_id and not prev.archived and prev.position < le.position
            and not exists (select 1 from public.lesson_progress lp where lp.lesson_id = prev.id and lp.student_id = p_uid and lp.status = 'completed'))
  );
$$;

-- The unit quiz opens when every lesson of the unit is completed.
create or replace function private.quiz_open(p_uid uuid, p_quiz_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.quizzes q
     where q.id = p_quiz_id
       and (q.unit_id is null or (
         private.unit_open(p_uid, q.unit_id)
         and not exists (
           select 1 from public.lessons le
            where le.unit_id = q.unit_id and not le.archived
              and not exists (select 1 from public.lesson_progress lp where lp.lesson_id = le.id and lp.student_id = p_uid and lp.status = 'completed'))))
  );
$$;

-- What still blocks the lesson, as an error code (null = can be completed).
create or replace function private.lesson_blocker(p_uid uuid, p_lesson_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_lesson public.lessons;
  v_features jsonb;
  v_ai_paused boolean;
  v_block jsonb;
begin
  select * into v_lesson from public.lessons where id = p_lesson_id;
  if not found or v_lesson.archived or not private.unit_is_live(v_lesson.unit_id) then
    return 'not_found';
  end if;
  if not private.lesson_open(p_uid, p_lesson_id) then
    return 'locked';
  end if;

  for v_block in select b from jsonb_array_elements(v_lesson.blocks) b
                  where b ->> 'type' = 'video' and b ? 'youtube_id'
                    and coalesce((b ->> 'needs_check')::boolean, false) = false loop
    if not exists (select 1 from public.video_views v
                    where v.student_id = p_uid and v.youtube_id = v_block ->> 'youtube_id' and v.completed_at is not null) then
      return 'video_required';
    end if;
  end loop;

  select p.features into v_features
    from public.units u join public.levels l on l.id = u.level_id join public.paths p on p.id = l.path_id
   where u.id = v_lesson.unit_id;
  -- While AI is paused by the admin, speaking/writing cannot be evaluated, so they do not block.
  v_ai_paused := coalesce((select value = 'true'::jsonb from public.settings where key = 'ai_paused'), false);
  if not v_ai_paused then
    if v_lesson.speaking_task is not null and coalesce((v_features ->> 'speaking')::boolean, false)
       and not exists (select 1 from public.speaking_attempts s where s.student_id = p_uid and s.lesson_id = p_lesson_id) then
      return 'speaking_required';
    end if;
    if v_lesson.writing_task is not null and coalesce((v_features ->> 'writing')::boolean, false)
       and not exists (select 1 from public.writing_submissions w where w.student_id = p_uid and w.lesson_id = p_lesson_id) then
      return 'writing_required';
    end if;
  end if;
  return null;
end;
$$;

-- The only way a student completes a lesson.
create or replace function public.complete_lesson(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_blocker text;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_blocker := private.lesson_blocker(v_uid, p_lesson_id);
  if v_blocker is not null then
    raise exception '%', v_blocker using errcode = 'P0001';
  end if;

  insert into public.lesson_progress (student_id, lesson_id, status, completed_at, synced_at)
  values (v_uid, p_lesson_id, 'completed', now(), now())
  on conflict (student_id, lesson_id) do update
    set status = 'completed', completed_at = coalesce(public.lesson_progress.completed_at, now()), synced_at = now();
  perform private.award_xp(v_uid, 'lesson', p_lesson_id::text, 10);
  return jsonb_build_object('ok', true);
end;
$$;

-- Students can still rate a lesson (their own row), but never mark it completed themselves.
create or replace function private.guard_lesson_progress()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if tg_op = 'INSERT' and (new.status <> 'started' or new.completed_at is not null) then
      raise exception 'use_complete_lesson' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and (new.status is distinct from old.status or new.completed_at is distinct from old.completed_at) then
      raise exception 'use_complete_lesson' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger lesson_progress_guard before insert or update on public.lesson_progress
  for each row execute function private.guard_lesson_progress();

-- Unit quizzes are submitted only after the unit's lessons (the service role is not limited).
create or replace function private.guard_quiz_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) = new.student_id and not private.quiz_open(new.student_id, new.quiz_id) then
    raise exception 'locked' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger quiz_attempts_guard before insert on public.quiz_attempts
  for each row execute function private.guard_quiz_attempt();

-- ---------------------------------------------------------------------------
-- Points from the rest of the platform.
-- ---------------------------------------------------------------------------
create or replace function private.xp_from_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Fields are read only inside the branch of their own table.
  if tg_table_name = 'quiz_attempts' then
    if new.passed then
      perform private.award_xp(new.student_id, 'quiz', new.quiz_id::text, 20);
      if new.score = 100 then
        perform private.award_xp(new.student_id, 'quiz_perfect', new.quiz_id::text, 10);
      end if;
    end if;
  elsif tg_table_name = 'speaking_attempts' then
    perform private.award_xp(new.student_id, 'speaking', new.lesson_id::text, 5);
  elsif tg_table_name = 'writing_submissions' then
    perform private.award_xp(new.student_id, 'writing', new.lesson_id::text, 5);
  elsif tg_table_name = 'certificates' then
    perform private.award_xp(new.student_id, 'certificate', new.level_id::text, 50);
  elsif tg_table_name = 'vocab_reviews' then
    if new.last_reviewed_at is not null then
      if tg_op = 'INSERT' then
        perform private.award_xp(new.student_id, 'vocab', new.vocab_item_id::text || ':' || (new.last_reviewed_at at time zone 'Asia/Aden')::date, 1);
      elsif new.review_count > old.review_count then
        -- one point per word per day
        perform private.award_xp(new.student_id, 'vocab', new.vocab_item_id::text || ':' || (new.last_reviewed_at at time zone 'Asia/Aden')::date, 1);
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger xp_quiz after insert on public.quiz_attempts for each row execute function private.xp_from_activity();
create trigger xp_speaking after insert on public.speaking_attempts for each row execute function private.xp_from_activity();
create trigger xp_writing after insert on public.writing_submissions for each row execute function private.xp_from_activity();
create trigger xp_certificate after insert on public.certificates for each row execute function private.xp_from_activity();
create trigger xp_vocab after insert or update on public.vocab_reviews for each row execute function private.xp_from_activity();

revoke all on function public.record_video_watch(text, integer) from public, anon;
grant execute on function public.record_video_watch(text, integer) to authenticated;
revoke all on function public.complete_lesson(uuid) from public, anon;
grant execute on function public.complete_lesson(uuid) to authenticated;

-- For the app: what blocks this lesson / is this quiz open, for the signed-in student.
create or replace function public.my_lesson_blocker(p_lesson_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select private.lesson_blocker((select auth.uid()), p_lesson_id);
$$;

create or replace function public.my_quiz_open(p_quiz_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.quiz_open((select auth.uid()), p_quiz_id);
$$;

revoke all on function public.my_lesson_blocker(uuid) from public, anon;
grant execute on function public.my_lesson_blocker(uuid) to authenticated;
revoke all on function public.my_quiz_open(uuid) from public, anon;
grant execute on function public.my_quiz_open(uuid) to authenticated;

-- Journey stops of the A1 units already imported (later imports read "stop_ar" from the package).
update public.units u
   set stop_ar = s.stop
  from (values
    ('A1-01', 'المكلا'), ('A1-02', 'الشحر'), ('A1-03', 'سيئون'), ('A1-04', 'الديس'),
    ('A1-05', 'ميناء المكلا'), ('A1-06', 'شرمة'), ('A1-07', 'شبام'), ('A1-08', 'غيل باوزير'),
    ('A1-09', 'سوق سيئون'), ('A1-10', 'تريم'), ('A1-11', 'دوعن'), ('A1-12', 'فوّة'), ('A1-13', 'القطن')
  ) as s (code, stop)
 where u.code = s.code and u.stop_ar is null;
