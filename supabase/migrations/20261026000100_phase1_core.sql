-- Phase 1: core schema for Raved (paths, profiles, applications, enrollments, content shells, settings).
-- Every table has RLS. Roles: student / admin (teacher reserved for later).

create extension if not exists pgcrypto;

-- Internal helpers live in `private`, which PostgREST does not expose.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- True when the current database user is not an API client role
-- (e.g. inside SECURITY DEFINER functions, migrations, or the service role).
create or replace function private.is_privileged_session()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user not in ('anon', 'authenticated');
$$;

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------
create table public.governorates (
  code text primary key,
  name_ar text not null,
  position smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.paths (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  title text not null check (char_length(title) between 2 and 120),
  summary text not null default '',
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'soon', 'published')),
  position smallint not null default 100,
  icon text not null default 'book',
  features jsonb not null default '{"placement":false,"vocab":false,"speaking":false,"writing":false,"exam_track":false,"projects":false}'::jsonb,
  est_months smallint,
  daily_minutes smallint not null default 25,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.levels (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.paths (id) on delete cascade,
  code text not null,
  title text not null,
  description text not null default '',
  position smallint not null,
  kind text not null default 'general' check (kind in ('general', 'exam')),
  est_hours smallint,
  planned_units smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (path_id, code)
);
create index levels_path_idx on public.levels (path_id, position);

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '',
  role text not null default 'student' check (role in ('student', 'admin', 'teacher')),
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  governorate text references public.governorates (code),
  city text check (city is null or char_length(city) <= 80),
  school text check (school is null or char_length(school) <= 120),
  grade smallint check (grade between 1 and 3),
  stream text check (stream in ('science', 'literary', 'undecided')),
  birth_date date,
  phone text check (phone is null or phone ~ '^\+9677[0-9]{8}$'),
  primary_path_id uuid references public.paths (id) on delete set null,
  daily_goal_minutes smallint not null default 25 check (daily_goal_minutes between 5 and 240),
  data_saver boolean not null default true,
  streak_days integer not null default 0,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and status <> 'suspended'
  );
$$;

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'active'
  );
$$;

-- Students may edit their own profile, but never their role, status or email.
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
     or new.created_at is distinct from old.created_at then
    raise exception 'forbidden_profile_change' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Create a profile for every new auth user.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_data_saver boolean;
begin
  select coalesce((value)::boolean, true) into v_data_saver
  from public.settings where key = 'data_saver_default';

  insert into public.profiles (id, email, full_name, data_saver)
  values (
    new.id,
    new.email,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 120),
    coalesce(v_data_saver, true)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.profiles (id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'needs_changes', 'approved', 'rejected')),
  path_id uuid references public.paths (id),
  target_exam text check (target_exam in ('ielts', 'toefl', 'det', 'undecided')),
  target_date text check (target_date in ('this_year', 'grad_summer', 'after_grad', 'unknown')),
  daily_minutes smallint check (daily_minutes between 5 and 240),
  motivation text check (motivation is null or char_length(motivation) <= 600),
  recommendation_path text,
  recommendation_name text check (recommendation_name is null or char_length(recommendation_name) <= 200),
  recommendation_size integer check (recommendation_size is null or recommendation_size <= 2097152),
  recommendation_deleted_at timestamptz,
  guardian_consent_at timestamptz,
  privacy_consent_at timestamptz,
  submitted_at timestamptz,
  review_note text check (review_note is null or char_length(review_note) <= 1000),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index applications_status_idx on public.applications (status, submitted_at);

-- Students edit only their draft data; status, consents and review fields change through functions.
create or replace function private.guard_application_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if private.is_privileged_session() or public.is_admin() then
    return new;
  end if;

  if new.recommendation_path is not null
     and (tg_op = 'INSERT' or new.recommendation_path is distinct from old.recommendation_path)
     and new.recommendation_path not like v_uid::text || '/%' then
    raise exception 'invalid_recommendation_path' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    new.status := 'draft';
    new.guardian_consent_at := null;
    new.privacy_consent_at := null;
    new.submitted_at := null;
    new.review_note := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.recommendation_deleted_at := null;
    return new;
  end if;

  if new.student_id is distinct from old.student_id
     or new.status is distinct from old.status
     or new.guardian_consent_at is distinct from old.guardian_consent_at
     or new.privacy_consent_at is distinct from old.privacy_consent_at
     or new.submitted_at is distinct from old.submitted_at
     or new.review_note is distinct from old.review_note
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at
     or new.recommendation_deleted_at is distinct from old.recommendation_deleted_at then
    raise exception 'forbidden_application_change' using errcode = '42501';
  end if;
  return new;
end;
$$;

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  path_id uuid not null references public.paths (id) on delete cascade,
  is_primary boolean not null default false,
  current_level_id uuid references public.levels (id) on delete set null,
  started_at timestamptz not null default now(),
  target jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, path_id)
);
create unique index enrollments_one_primary on public.enrollments (student_id) where is_primary;

create table public.path_waitlist (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.paths (id) on delete cascade,
  student_id uuid references public.profiles (id) on delete cascade,
  email text check (email is null or (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (student_id is not null or email is not null),
  unique (path_id, student_id),
  unique (path_id, email)
);

-- ---------------------------------------------------------------------------
-- Content shells (filled from phase 2)
-- ---------------------------------------------------------------------------
create table public.units (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.levels (id) on delete cascade,
  code text not null unique,
  position smallint not null,
  title text not null,
  topic text not null default '',
  grammar_point text not null default '',
  can_do text not null default '',
  status text not null default 'draft' check (status in ('draft', 'review', 'published')),
  version integer not null default 1,
  package_size_bytes integer,
  source_package jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index units_level_idx on public.units (level_id, position);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  position smallint not null,
  skill text not null,
  title text not null,
  est_minutes smallint,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'changes')),
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, position)
);

create table public.lesson_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  type text not null check (type in ('text', 'video', 'reading', 'audio', 'table', 'exercise')),
  position smallint not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, position)
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  youtube_id text not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null default '',
  channel text not null default '',
  channel_url text,
  duration_sec integer,
  start_sec integer,
  end_sec integer,
  status text not null default 'ok' check (status in ('ok', 'broken')),
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Exams, settings, notifications, audit
-- ---------------------------------------------------------------------------
create table public.exams (
  code text primary key check (code ~ '^[a-z]{2,10}$'),
  name text not null,
  summary text not null default '',
  availability_ye text not null default '',
  locations text not null default '',
  fee_note text not null default '',
  payment_note text not null default '',
  score_scale text not null default '',
  official_practice_url text,
  position smallint not null default 100,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.settings (
  key text primary key,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notifications_student_idx on public.notifications (student_id, created_at desc);

-- Students may only mark their notifications as read.
create or replace function private.guard_notification_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_privileged_session() or public.is_admin() then
    return new;
  end if;
  if (to_jsonb(new) - 'read_at' - 'updated_at') is distinct from (to_jsonb(old) - 'read_at' - 'updated_at') then
    raise exception 'forbidden_notification_change' using errcode = '42501';
  end if;
  return new;
end;
$$;

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'governorates', 'paths', 'levels', 'profiles', 'applications', 'enrollments', 'path_waitlist',
    'units', 'lessons', 'lesson_blocks', 'sources', 'exams', 'settings', 'notifications', 'audit_log'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()', t
    );
  end loop;
end;
$$;

create trigger guard_profile_update before update on public.profiles
  for each row execute function private.guard_profile_update();
create trigger guard_application_write before insert or update on public.applications
  for each row execute function private.guard_application_write();
create trigger guard_notification_update before update on public.notifications
  for each row execute function private.guard_notification_update();
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.governorates enable row level security;
alter table public.paths enable row level security;
alter table public.levels enable row level security;
alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.enrollments enable row level security;
alter table public.path_waitlist enable row level security;
alter table public.units enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_blocks enable row level security;
alter table public.sources enable row level security;
alter table public.exams enable row level security;
alter table public.settings enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- governorates: public read
create policy governorates_read on public.governorates for select to anon, authenticated using (true);
create policy governorates_admin on public.governorates for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- paths: anyone sees non-draft paths; admin manages all
create policy paths_read on public.paths for select to anon, authenticated
  using (status <> 'draft' or (select public.is_admin()));
create policy paths_admin on public.paths for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- levels: visible when their path is visible
create policy levels_read on public.levels for select to anon, authenticated
  using (exists (select 1 from public.paths p where p.id = path_id and (p.status <> 'draft' or (select public.is_admin()))));
create policy levels_admin on public.levels for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- profiles: own row or admin
create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- applications: own row (editable while draft / needs_changes) or admin
create policy applications_read on public.applications for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));
create policy applications_insert on public.applications for insert to authenticated
  with check (student_id = (select auth.uid()) or (select public.is_admin()));
create policy applications_update on public.applications for update to authenticated
  using ((student_id = (select auth.uid()) and status in ('draft', 'needs_changes')) or (select public.is_admin()))
  with check (student_id = (select auth.uid()) or (select public.is_admin()));
create policy applications_delete on public.applications for delete to authenticated
  using ((select public.is_admin()));

-- enrollments: students read their own; admin manages
create policy enrollments_read on public.enrollments for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));
create policy enrollments_admin on public.enrollments for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- path_waitlist: anyone can join; only the owner and admin can read
create policy waitlist_insert_anon on public.path_waitlist for insert to anon
  with check (student_id is null and email is not null and notified_at is null);
create policy waitlist_insert_auth on public.path_waitlist for insert to authenticated
  with check ((student_id = (select auth.uid()) or (student_id is null and email is not null)) and notified_at is null);
create policy waitlist_read on public.path_waitlist for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));
create policy waitlist_delete on public.path_waitlist for delete to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));
create policy waitlist_admin_update on public.path_waitlist for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- units: published units of visible paths are public (titles and sizes for path pages)
create policy units_read on public.units for select to anon, authenticated
  using (
    (select public.is_admin())
    or (status = 'published' and exists (
      select 1 from public.levels l join public.paths p on p.id = l.path_id
      where l.id = level_id and p.status = 'published'))
  );
create policy units_admin on public.units for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- lessons and blocks: active members only, published units only
create policy lessons_read on public.lessons for select to authenticated
  using (
    (select public.is_admin())
    or ((select public.is_active_member()) and exists (
      select 1 from public.units u where u.id = unit_id and u.status = 'published'))
  );
create policy lessons_admin on public.lessons for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy lesson_blocks_read on public.lesson_blocks for select to authenticated
  using (
    (select public.is_admin())
    or ((select public.is_active_member()) and exists (
      select 1 from public.lessons le join public.units u on u.id = le.unit_id
      where le.id = lesson_id and u.status = 'published'))
  );
create policy lesson_blocks_admin on public.lesson_blocks for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy sources_read on public.sources for select to authenticated
  using ((select public.is_active_member()) or (select public.is_admin()));
create policy sources_admin on public.sources for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- exams: public read, admin edits
create policy exams_read on public.exams for select to anon, authenticated using (true);
create policy exams_admin on public.exams for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- settings: admin only (functions read them with definer rights)
create policy settings_admin on public.settings for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- notifications: own (read + mark read + delete), admin all
create policy notifications_read on public.notifications for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));
create policy notifications_update on public.notifications for update to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()))
  with check (student_id = (select auth.uid()) or (select public.is_admin()));
create policy notifications_delete on public.notifications for delete to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));
create policy notifications_admin_insert on public.notifications for insert to authenticated
  with check ((select public.is_admin()));

-- audit_log: admin reads; admin writes entries as themselves
create policy audit_read on public.audit_log for select to authenticated using ((select public.is_admin()));
create policy audit_insert on public.audit_log for insert to authenticated
  with check ((select public.is_admin()) and actor_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Application workflow functions
-- ---------------------------------------------------------------------------
create or replace function private.approve_application(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app public.applications;
  v_level uuid;
begin
  select * into v_app from public.applications where id = p_application_id;

  update public.profiles
     set status = 'active',
         primary_path_id = coalesce(primary_path_id, v_app.path_id),
         daily_goal_minutes = coalesce(v_app.daily_minutes, daily_goal_minutes)
   where id = v_app.student_id and status <> 'suspended';

  select id into v_level from public.levels
   where path_id = v_app.path_id and kind = 'general'
   order by position limit 1;

  insert into public.enrollments (student_id, path_id, is_primary, current_level_id, target)
  values (
    v_app.student_id, v_app.path_id,
    not exists (select 1 from public.enrollments e where e.student_id = v_app.student_id and e.is_primary),
    v_level,
    jsonb_build_object('exam', v_app.target_exam, 'date', v_app.target_date)
  )
  on conflict (student_id, path_id) do nothing;
end;
$$;

-- Student submits their application (step 2). Returns the new status.
create or replace function public.submit_application(p_guardian_consent boolean, p_privacy_consent boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_app public.applications;
  v_profile public.profiles;
  v_mode text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_app from public.applications where student_id = v_uid for update;
  if not found then
    raise exception 'application_not_found' using errcode = 'P0002';
  end if;
  if v_app.status not in ('draft', 'needs_changes') then
    raise exception 'application_not_editable' using errcode = 'P0001';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if v_profile.full_name = '' or v_profile.birth_date is null or v_profile.governorate is null
     or v_profile.city is null or v_profile.school is null or v_profile.grade is null
     or v_profile.stream is null or v_profile.phone is null then
    raise exception 'profile_incomplete' using errcode = 'P0001';
  end if;

  if v_app.path_id is null or not exists (select 1 from public.paths where id = v_app.path_id and status = 'published') then
    raise exception 'path_required' using errcode = 'P0001';
  end if;
  if v_app.target_exam is null or v_app.target_date is null or v_app.daily_minutes is null then
    raise exception 'goal_incomplete' using errcode = 'P0001';
  end if;
  if v_app.recommendation_path is null then
    raise exception 'recommendation_required' using errcode = 'P0001';
  end if;
  if not coalesce(p_guardian_consent, false) or not coalesce(p_privacy_consent, false) then
    raise exception 'consent_required' using errcode = 'P0001';
  end if;

  update public.applications
     set status = 'submitted',
         guardian_consent_at = now(),
         privacy_consent_at = now(),
         submitted_at = now()
   where id = v_app.id;

  select coalesce(value #>> '{}', 'review') into v_mode from public.settings where key = 'admission_mode';
  if v_mode = 'auto' then
    update public.applications
       set status = 'approved', reviewed_at = now(), review_note = null
     where id = v_app.id;
    perform private.approve_application(v_app.id);
    insert into public.notifications (student_id, type, title, body, link)
    values (v_uid, 'application', 'تم قبولك في رفد', 'أهلاً بك! تستطيع أن تبدأ الآن.', '/student');
    return 'approved';
  end if;

  return 'submitted';
end;
$$;

-- Admin decides on an application. Returns data needed for the email.
create or replace function public.review_application(p_application_id uuid, p_decision text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_app public.applications;
  v_profile public.profiles;
  v_title text;
  v_body text;
  v_link text;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'needs_changes', 'rejected') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
  if p_decision in ('needs_changes', 'rejected') and coalesce(btrim(p_note), '') = '' then
    raise exception 'note_required' using errcode = 'P0001';
  end if;

  select * into v_app from public.applications where id = p_application_id for update;
  if not found then
    raise exception 'application_not_found' using errcode = 'P0002';
  end if;
  if v_app.status not in ('submitted', 'needs_changes', 'rejected') then
    raise exception 'application_not_reviewable' using errcode = 'P0001';
  end if;

  update public.applications
     set status = p_decision,
         review_note = nullif(btrim(p_note), ''),
         reviewed_by = v_uid,
         reviewed_at = now()
   where id = v_app.id;

  if p_decision = 'approved' then
    perform private.approve_application(v_app.id);
    v_title := 'تم قبولك في رفد';
    v_body := 'أهلاً بك! تستطيع أن تبدأ الآن.';
    v_link := '/student';
  elsif p_decision = 'needs_changes' then
    v_title := 'طلبك يحتاج تعديلاً';
    v_body := btrim(p_note);
    v_link := '/apply/goal';
  else
    v_title := 'لم يُقبل طلبك هذه المرة';
    v_body := btrim(p_note);
    v_link := '/apply/status';
  end if;

  insert into public.notifications (student_id, type, title, body, link)
  values (v_app.student_id, 'application', v_title, v_body, v_link);

  insert into public.audit_log (actor_id, action, target, data)
  values (v_uid, 'application.' || p_decision, v_app.id::text, jsonb_build_object('note', p_note));

  select * into v_profile from public.profiles where id = v_app.student_id;
  return jsonb_build_object(
    'student_id', v_app.student_id,
    'email', v_profile.email,
    'full_name', v_profile.full_name,
    'decision', p_decision,
    'note', nullif(btrim(p_note), '')
  );
end;
$$;

-- Admin publishes/updates a path; when it becomes published, waitlisted students are notified in-app.
-- Returns the emails of waitlisted visitors to notify by email.
create or replace function public.notify_path_waitlist(p_path_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path public.paths;
  v_emails text[];
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_path from public.paths where id = p_path_id;
  if not found or v_path.status <> 'published' then
    raise exception 'path_not_published' using errcode = 'P0001';
  end if;

  insert into public.notifications (student_id, type, title, body, link)
  select w.student_id, 'path_launch', 'انطلق مسار ' || v_path.title, 'المسار الذي طلبت إبلاغك به متاح الآن.', '/paths/' || v_path.slug
    from public.path_waitlist w
   where w.path_id = p_path_id and w.student_id is not null and w.notified_at is null;

  select coalesce(array_agg(coalesce(w.email, pr.email)) filter (where coalesce(w.email, pr.email) is not null), '{}')
    into v_emails
    from public.path_waitlist w
    left join public.profiles pr on pr.id = w.student_id
   where w.path_id = p_path_id and w.notified_at is null;

  update public.path_waitlist set notified_at = now() where path_id = p_path_id and notified_at is null;

  insert into public.audit_log (actor_id, action, target, data)
  values ((select auth.uid()), 'path.notify_waitlist', p_path_id::text, jsonb_build_object('emails', coalesce(array_length(v_emails, 1), 0)));

  return v_emails;
end;
$$;

revoke all on function private.approve_application(uuid) from public, anon, authenticated;
revoke all on function public.submit_application(boolean, boolean) from public, anon;
revoke all on function public.review_application(uuid, text, text) from public, anon;
revoke all on function public.notify_path_waitlist(uuid) from public, anon;
grant execute on function public.submit_application(boolean, boolean) to authenticated;
grant execute on function public.review_application(uuid, text, text) to authenticated;
grant execute on function public.notify_path_waitlist(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for teacher recommendations (≤ 2MB, images or PDF)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recommendations', 'recommendations', false, 2097152,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy recommendations_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'recommendations' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy recommendations_read_own_or_admin on storage.objects for select to authenticated
  using (bucket_id = 'recommendations'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));

-- A student may remove a file only while it is not attached to a submitted application.
create policy recommendations_delete on storage.objects for delete to authenticated
  using (bucket_id = 'recommendations' and (
    (select public.is_admin())
    or ((storage.foldername(name))[1] = (select auth.uid())::text
        and not exists (
          select 1 from public.applications a
          where a.student_id = (select auth.uid())
            and a.recommendation_path = name
            and a.status not in ('draft', 'needs_changes')))
  ));
