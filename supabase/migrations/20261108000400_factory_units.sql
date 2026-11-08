-- «مصنع المحتوى», stage 2: building units one by one, and video parts.
-- A level that follows a playlist splits one episode across the unit's lessons, so a video is now
-- tracked per part (youtube id + start second) when its block has an end_sec: watching the vocab part
-- does not count for the grammar part. Blocks without end_sec keep the whole-video tracking.

alter table public.agent_jobs drop constraint if exists agent_jobs_kind_check;
alter table public.agent_jobs add constraint agent_jobs_kind_check
  check (kind in ('plan_path', 'build_unit', 'improve_unit', 'plan_level', 'factory_unit', 'factory_lesson'));

alter table public.curriculum_units
  add column if not exists build_job_id uuid references public.agent_jobs (id) on delete set null,
  add column if not exists teacher_ok_by uuid references public.profiles (id) on delete set null,
  add column if not exists teacher_ok_at timestamptz,
  add column if not exists review_note text check (review_note is null or char_length(review_note) <= 1000);

-- ---------------------------------------------------------------------------
-- Video parts
-- ---------------------------------------------------------------------------
create table public.video_part_views (
  student_id uuid not null references public.profiles (id) on delete cascade,
  youtube_id text not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  start_sec integer not null check (start_sec >= 0),
  duration_sec integer not null check (duration_sec > 0),
  watched_sec integer not null default 0 check (watched_sec >= 0),
  first_seen_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, youtube_id, start_sec)
);
create trigger set_updated_at before update on public.video_part_views for each row execute function private.set_updated_at();
alter table public.video_part_views enable row level security;
create policy video_part_views_read on public.video_part_views for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));

-- Length of a part as written in the published content (the client is not trusted for it).
create or replace function private.video_part_duration(p_youtube_id text, p_start_sec integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select max((b ->> 'end_sec')::integer - coalesce(nullif(b ->> 'start_sec', '')::integer, 0))
    from public.lessons le, jsonb_array_elements(le.blocks) b
   where b ->> 'type' = 'video' and b ->> 'youtube_id' = p_youtube_id
     and (b ->> 'end_sec') ~ '^[0-9]+$'
     and coalesce(nullif(b ->> 'start_sec', '')::integer, 0) = p_start_sec
     and not le.archived and private.unit_is_live(le.unit_id);
$$;

-- Same rules as record_video_watch (seconds really played, capped by the time since first opened).
create or replace function public.record_video_part(p_youtube_id text, p_start_sec integer, p_watched_sec integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_duration integer;
  v_row public.video_part_views;
  v_allowed integer;
  v_watched integer;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_duration := private.video_part_duration(p_youtube_id, coalesce(p_start_sec, 0));
  if v_duration is null or v_duration <= 0 then
    raise exception 'video_not_found' using errcode = 'P0002';
  end if;

  insert into public.video_part_views (student_id, youtube_id, start_sec, duration_sec)
  values (v_uid, p_youtube_id, coalesce(p_start_sec, 0), v_duration)
  on conflict (student_id, youtube_id, start_sec) do nothing;
  select * into v_row from public.video_part_views where student_id = v_uid and youtube_id = p_youtube_id and start_sec = coalesce(p_start_sec, 0);

  v_allowed := least(v_duration, floor(extract(epoch from (now() - v_row.first_seen_at)) * 2)::integer + 15);
  v_watched := greatest(v_row.watched_sec, least(greatest(coalesce(p_watched_sec, 0), 0), v_allowed));

  update public.video_part_views
     set watched_sec = v_watched,
         duration_sec = v_duration,
         completed_at = coalesce(completed_at, case when private.video_done(v_watched, v_duration) then now() end)
   where student_id = v_uid and youtube_id = p_youtube_id and start_sec = coalesce(p_start_sec, 0)
  returning * into v_row;

  if v_row.completed_at is not null then
    perform private.award_xp(v_uid, 'video', p_youtube_id || '@' || coalesce(p_start_sec, 0), 5);
  end if;
  return jsonb_build_object('watched_sec', v_row.watched_sec, 'duration_sec', v_row.duration_sec, 'done', v_row.completed_at is not null);
end;
$$;
revoke all on function public.record_video_part(text, integer, integer) from public, anon;
grant execute on function public.record_video_part(text, integer, integer) to authenticated;

-- The lesson blocker, now checking video parts for blocks with an end_sec.
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
    if (v_block ->> 'end_sec') ~ '^[0-9]+$' then
      if not exists (select 1 from public.video_part_views v
                      where v.student_id = p_uid and v.youtube_id = v_block ->> 'youtube_id'
                        and v.start_sec = coalesce(nullif(v_block ->> 'start_sec', '')::integer, 0)
                        and v.completed_at is not null) then
        return 'video_required';
      end if;
    elsif not exists (select 1 from public.video_views v
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

-- ---------------------------------------------------------------------------
-- Reviewing built units: teachers edit a unit build (its job output) and ask for one lesson to be
-- rebuilt; publishing stays with the admin (import_unit_package / publish_unit are admin-only).
-- ---------------------------------------------------------------------------
create policy agent_jobs_staff_update on public.agent_jobs for update to authenticated
  using ((select public.is_staff()) and kind in ('factory_unit', 'factory_lesson'))
  with check ((select public.is_staff()) and kind in ('factory_unit', 'factory_lesson'));
create policy agent_jobs_staff_insert on public.agent_jobs for insert to authenticated
  with check ((select public.is_staff()) and kind = 'factory_lesson');

-- An approved map stays locked, but the build fields of its units (status, review) keep changing.
create or replace function private.guard_curriculum_rows()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_level uuid := coalesce(new.level_id, old.level_id);
begin
  if private.is_privileged_session() or public.is_admin() then
    return coalesce(new, old);
  end if;
  if not exists (select 1 from public.curriculum_levels where level_id = v_level and status = 'approved') then
    return coalesce(new, old);
  end if;
  if tg_table_name = 'curriculum_units' and tg_op = 'UPDATE'
     and (to_jsonb(new) - array['build_status', 'build_job_id', 'teacher_ok_by', 'teacher_ok_at', 'review_note', 'unit_id', 'updated_at'])
       = (to_jsonb(old) - array['build_status', 'build_job_id', 'teacher_ok_by', 'teacher_ok_at', 'review_note', 'unit_id', 'updated_at']) then
    return new;
  end if;
  raise exception 'map_locked';
end;
$$;

-- The job guard: a person may approve/reject a finished job (as before) and, for a built unit waiting
-- for review, staff may edit its output (the reviewer's corrections); nothing else.
create or replace function private.agent_jobs_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_privileged_session() then
    new.updated_at := now();
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'queued';
    new.step := null;
    new.progress := 0;
    new.log := '[]'::jsonb;
    new.output := null;
    new.error := null;
    new.model := null;
    new.review_note := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.created_by := (select auth.uid());
    new.started_at := null;
    new.finished_at := null;
    return new;
  end if;
  if old.kind in ('factory_unit', 'factory_lesson') and old.status = 'needs_review' and new.status = 'needs_review' then
    if new.input is distinct from old.input or new.kind <> old.kind or new.path_id <> old.path_id or new.log is distinct from old.log then
      raise exception 'agent_job_locked' using errcode = '42501';
    end if;
    new.updated_at := now();
    return new;
  end if;
  if old.status <> 'needs_review' or new.status not in ('approved', 'rejected') then
    raise exception 'agent_job_not_reviewable' using errcode = 'P0001';
  end if;
  if new.output is distinct from old.output or new.input is distinct from old.input or new.kind <> old.kind
     or new.path_id <> old.path_id or new.log is distinct from old.log then
    raise exception 'agent_job_locked' using errcode = '42501';
  end if;
  new.reviewed_by := (select auth.uid());
  new.reviewed_at := now();
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Weekly insights per published unit (no student identities): pass rate, item analysis of every quiz
-- question (difficulty, discrimination, flag) and lessons rated "not useful". Written by the weekly job.
-- ---------------------------------------------------------------------------
create table public.unit_insights (
  unit_id uuid primary key references public.units (id) on delete cascade,
  attempts integer not null default 0 check (attempts >= 0),
  pass_rate numeric(4, 3) not null default 0,
  items jsonb not null default '[]'::jsonb,
  lessons jsonb not null default '[]'::jsonb,
  flagged integer not null default 0,
  computed_at timestamptz not null default now()
);
alter table public.unit_insights enable row level security;
create policy unit_insights_staff_read on public.unit_insights for select to authenticated using ((select public.is_staff()));
