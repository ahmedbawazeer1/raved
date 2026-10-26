-- Phase 2: content import/review, vocabulary, quizzes (server-graded), lesson progress, reports.

-- Full packages are admin-only (they contain quiz answers), so they live in unit_packages.
-- units.source_package (unused, publicly readable) must stay empty forever.
alter table public.units add constraint units_source_package_unused check (source_package is null);

-- Blocks are stored with their lesson (always read together); removed lessons/words are archived, not deleted.
alter table public.lessons
  add column if not exists item_key text,
  add column if not exists speaking_task jsonb,
  add column if not exists writing_task jsonb,
  add column if not exists blocks jsonb not null default '[]'::jsonb,
  add column if not exists archived boolean not null default false;
create unique index if not exists lessons_unit_item_key on public.lessons (unit_id, item_key);

create table public.unit_packages (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  version integer not null,
  package jsonb not null,
  size_bytes integer not null,
  imported_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index unit_packages_unit_idx on public.unit_packages (unit_id, created_at desc);

create table public.vocab_items (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  item_key text not null,
  position smallint not null,
  word text not null,
  ipa text,
  part_of_speech text not null,
  meaning_ar text not null,
  example_en text not null,
  example_ar text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, item_key)
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references public.units (id) on delete cascade,
  level_id uuid references public.levels (id) on delete cascade,
  kind text not null default 'unit' check (kind in ('unit', 'level_end')),
  pass_percent smallint not null default 70 check (pass_percent between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'unit' and unit_id is not null) or (kind = 'level_end' and level_id is not null))
);
create unique index quizzes_one_per_unit on public.quizzes (unit_id) where kind = 'unit';

-- Answers never leave the server: students have no SELECT on this table (see get_quiz()).
-- questions: [{id, kind, skill, prompt, options, answer, explanation_ar}] in order.
create table public.quiz_keys (
  quiz_id uuid primary key references public.quizzes (id) on delete cascade,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  answers jsonb not null,
  results jsonb not null,
  correct smallint not null,
  total smallint not null,
  score smallint not null,
  passed boolean not null,
  submitted_offline boolean not null default false,
  client_id uuid,
  client_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, client_id)
);
create index quiz_attempts_student_idx on public.quiz_attempts (student_id, quiz_id, created_at desc);

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  status text not null default 'started' check (status in ('started', 'completed')),
  video_position_sec integer,
  completed_at timestamptz,
  rating text check (rating in ('useful', 'not_useful')),
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  kind text not null check (kind in ('error', 'not_useful', 'broken_link')),
  note text check (note is null or char_length(note) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare
  t text;
begin
  foreach t in array array['unit_packages', 'vocab_items', 'quizzes', 'quiz_keys', 'quiz_attempts', 'lesson_progress', 'reports'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- True when called by a trusted backend (service role or a direct database session),
-- never by an API user. Unlike private.is_privileged_session(), this reads the session
-- role, so it stays correct inside SECURITY DEFINER functions.
create or replace function private.is_backend_caller()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(nullif(current_setting('role', true), ''), 'none') not in ('anon', 'authenticated');
$$;

-- Helper: is this unit published (and its path published)?
create or replace function private.unit_is_live(p_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.units u
    join public.levels l on l.id = u.level_id
    join public.paths p on p.id = l.path_id
    where u.id = p_unit_id and u.status = 'published' and p.status = 'published'
  );
$$;

-- RLS
create policy unit_packages_admin on public.unit_packages for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy vocab_items_read on public.vocab_items for select to authenticated
  using ((select public.is_admin()) or (not archived and (select public.is_active_member()) and private.unit_is_live(unit_id)));

-- Archived lessons are hidden from students (restrictive: combined with the phase 1 read policy).
create policy lessons_hide_archived on public.lessons as restrictive for select to authenticated
  using (not archived or (select public.is_admin()));
create policy vocab_items_admin on public.vocab_items for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy quizzes_read on public.quizzes for select to authenticated
  using ((select public.is_admin()) or ((select public.is_active_member()) and (unit_id is null or private.unit_is_live(unit_id))));
create policy quizzes_admin on public.quizzes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy quiz_keys_admin on public.quiz_keys for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Attempts are created only by submit_quiz(); students read their own.
create policy quiz_attempts_read on public.quiz_attempts for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));

create policy lesson_progress_read on public.lesson_progress for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));
create policy lesson_progress_insert on public.lesson_progress for insert to authenticated
  with check (student_id = (select auth.uid()) and (select public.is_active_member())
              and exists (select 1 from public.lessons le where le.id = lesson_id and private.unit_is_live(le.unit_id)));
create policy lesson_progress_update on public.lesson_progress for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

create policy reports_insert on public.reports for insert to authenticated
  with check (student_id = (select auth.uid()) and status = 'open');
create policy reports_read on public.reports for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));
create policy reports_admin on public.reports for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Import a validated unit package (admin or service role). Keeps lesson and vocab
-- rows stable by their package ids so students' progress survives updates.
-- ---------------------------------------------------------------------------
create or replace function public.import_unit_package(p_package jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_level_id uuid;
  v_unit_id uuid;
  v_quiz_id uuid;
  v_lesson jsonb;
  v_vocab jsonb;
  v_i integer;
  v_size integer := octet_length(p_package::text);
begin
  if not (private.is_backend_caller() or public.is_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select l.id into v_level_id
    from public.levels l join public.paths p on p.id = l.path_id
   where p.slug = p_package ->> 'path' and l.code = p_package ->> 'level';
  if v_level_id is null then
    raise exception 'unknown_level' using errcode = 'P0001';
  end if;

  insert into public.units (level_id, code, position, title, topic, grammar_point, can_do, status, version, package_size_bytes)
  values (
    v_level_id, p_package ->> 'code', (p_package ->> 'position')::smallint, p_package ->> 'title',
    coalesce(p_package ->> 'topic', ''), coalesce(p_package ->> 'grammar_point', ''),
    coalesce((select string_agg(x, E'\n') from jsonb_array_elements_text(p_package -> 'can_do') x), ''),
    'review', (p_package ->> 'version')::integer, v_size
  )
  on conflict (code) do update
    set level_id = excluded.level_id, position = excluded.position, title = excluded.title,
        topic = excluded.topic, grammar_point = excluded.grammar_point, can_do = excluded.can_do,
        version = excluded.version, package_size_bytes = excluded.package_size_bytes,
        status = case when public.units.status = 'published' then 'published' else 'review' end
  returning id into v_unit_id;

  insert into public.unit_packages (unit_id, version, package, size_bytes, imported_by)
  values (v_unit_id, (p_package ->> 'version')::integer, p_package, v_size, (select auth.uid()));

  -- Lessons: upsert by package id (ids stay stable, so progress survives). Lessons missing from the
  -- package are archived. Park positions first (unique negatives) so reordering never clashes.
  update public.lessons l
     set position = -s.rn, archived = true
    from (select id, row_number() over (order by id) as rn from public.lessons where unit_id = v_unit_id) s
   where l.id = s.id;
  for v_lesson in select * from jsonb_array_elements(p_package -> 'lessons') loop
    insert into public.lessons (unit_id, item_key, position, skill, title, est_minutes, speaking_task, writing_task, blocks, archived, review_status, review_note)
    values (
      v_unit_id, v_lesson ->> 'id', (v_lesson ->> 'position')::smallint, v_lesson ->> 'skill', v_lesson ->> 'title',
      (v_lesson ->> 'est_minutes')::smallint, v_lesson -> 'speaking_task', v_lesson -> 'writing_task',
      coalesce(v_lesson -> 'blocks', '[]'::jsonb), false, 'pending', null
    )
    on conflict (unit_id, item_key) do update
      set position = excluded.position, skill = excluded.skill, title = excluded.title, est_minutes = excluded.est_minutes,
          speaking_task = excluded.speaking_task, writing_task = excluded.writing_task, blocks = excluded.blocks,
          archived = false, review_status = 'pending', review_note = null;
  end loop;

  -- Vocabulary: upsert by package id; words missing from the package are archived.
  update public.vocab_items set archived = true where unit_id = v_unit_id;
  v_i := 0;
  for v_vocab in select * from jsonb_array_elements(p_package -> 'vocab') loop
    v_i := v_i + 1;
    insert into public.vocab_items (unit_id, item_key, position, word, ipa, part_of_speech, meaning_ar, example_en, example_ar, archived)
    values (v_unit_id, v_vocab ->> 'id', v_i, v_vocab ->> 'word', v_vocab ->> 'ipa', v_vocab ->> 'part_of_speech',
            v_vocab ->> 'meaning_ar', v_vocab ->> 'example_en', v_vocab ->> 'example_ar', false)
    on conflict (unit_id, item_key) do update
      set position = excluded.position, word = excluded.word, ipa = excluded.ipa, part_of_speech = excluded.part_of_speech,
          meaning_ar = excluded.meaning_ar, example_en = excluded.example_en, example_ar = excluded.example_ar, archived = false;
  end loop;

  -- Unit quiz: the answer key is replaced as a whole (attempts keep their own copy of results).
  insert into public.quizzes (unit_id, kind, pass_percent)
  values (v_unit_id, 'unit', coalesce((p_package #>> '{quiz,pass_percent}')::smallint, 70))
  on conflict (unit_id) where kind = 'unit' do update set pass_percent = excluded.pass_percent
  returning id into v_quiz_id;

  insert into public.quiz_keys (quiz_id, questions)
  values (v_quiz_id, coalesce(p_package #> '{quiz,questions}', '[]'::jsonb))
  on conflict (quiz_id) do update set questions = excluded.questions;

  return v_unit_id;
end;
$$;

-- Publish only when every lesson is approved (CNT-02).
create or replace function public.publish_unit(p_unit_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (private.is_backend_caller() or public.is_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if exists (select 1 from public.lessons where unit_id = p_unit_id and not archived and review_status <> 'approved') then
    raise exception 'lessons_not_approved' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.lessons where unit_id = p_unit_id and not archived) then
    raise exception 'unit_empty' using errcode = 'P0001';
  end if;
  update public.units set status = 'published' where id = p_unit_id;
  insert into public.audit_log (actor_id, action, target) values ((select auth.uid()), 'unit.publish', p_unit_id::text);
end;
$$;

-- ---------------------------------------------------------------------------
-- Quizzes: questions without answers, and server-side grading.
-- ---------------------------------------------------------------------------
create or replace function public.get_quiz(p_quiz_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_quiz public.quizzes;
begin
  select * into v_quiz from public.quizzes where id = p_quiz_id;
  if not found then
    raise exception 'quiz_not_found' using errcode = 'P0002';
  end if;
  if not (public.is_admin() or (public.is_active_member() and (v_quiz.unit_id is null or private.unit_is_live(v_quiz.unit_id)))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'id', v_quiz.id,
    'pass_percent', v_quiz.pass_percent,
    'questions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', q ->> 'id',
          'kind', q ->> 'kind',
          'skill', q ->> 'skill',
          'prompt', q ->> 'prompt',
          'options', q -> 'options',
          -- order_words: give the words (stably shuffled), never their order
          'words', case when q ->> 'kind' = 'order_words' then (
            select jsonb_agg(w order by md5(w || (q ->> 'id'))) from jsonb_array_elements_text(q -> 'answer') w
          ) end
        ) order by ord)
      from public.quiz_keys k, jsonb_array_elements(k.questions) with ordinality as t(q, ord)
      where k.quiz_id = v_quiz.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function private.normalize_answer(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(regexp_replace(btrim(coalesce(p, '')), '[[:space:]]+', ' ', 'g'), '[.!?,;:]+$', ''));
$$;

-- Grades answers ({question_id: answer}) and stores the attempt. Idempotent per client id (offline sync).
create or replace function public.submit_quiz(
  p_quiz_id uuid,
  p_answers jsonb,
  p_client_id uuid default null,
  p_client_created_at timestamptz default null,
  p_offline boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_quiz public.quizzes;
  v_q jsonb;
  v_given jsonb;
  v_ok boolean;
  v_results jsonb := '[]'::jsonb;
  v_correct integer := 0;
  v_total integer := 0;
  v_score integer;
  v_attempt uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_client_id is not null then
    select id into v_attempt from public.quiz_attempts where student_id = v_uid and client_id = p_client_id;
    if found then
      return v_attempt;
    end if;
  end if;

  select * into v_quiz from public.quizzes where id = p_quiz_id;
  if not found then
    raise exception 'quiz_not_found' using errcode = 'P0002';
  end if;
  if not (public.is_active_member() and (v_quiz.unit_id is null or private.unit_is_live(v_quiz.unit_id))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  for v_q in
    select q from public.quiz_keys k, jsonb_array_elements(k.questions) with ordinality as t(q, ord)
     where k.quiz_id = p_quiz_id order by ord
  loop
    v_total := v_total + 1;
    v_given := coalesce(p_answers, '{}'::jsonb) -> (v_q ->> 'id');
    v_ok := case v_q ->> 'kind'
      when 'mcq' then jsonb_typeof(v_given) = 'number' and v_given = v_q -> 'answer'
      when 'true_false' then jsonb_typeof(v_given) = 'number' and v_given = v_q -> 'answer'
      when 'fill_blank' then jsonb_typeof(v_given) = 'string'
        and private.normalize_answer(v_given #>> '{}') = private.normalize_answer(v_q ->> 'answer')
      when 'order_words' then jsonb_typeof(v_given) = 'array'
        and (select string_agg(private.normalize_answer(x), ' ') from jsonb_array_elements_text(v_given) x)
          = (select string_agg(private.normalize_answer(x), ' ') from jsonb_array_elements_text(v_q -> 'answer') x)
      else false
    end;
    v_ok := coalesce(v_ok, false);
    if v_ok then
      v_correct := v_correct + 1;
    end if;
    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'id', v_q ->> 'id', 'kind', v_q ->> 'kind', 'skill', v_q ->> 'skill', 'prompt', v_q ->> 'prompt',
      'options', v_q -> 'options', 'given', v_given, 'answer', v_q -> 'answer', 'correct', v_ok,
      'explanation_ar', v_q ->> 'explanation_ar'
    ));
  end loop;

  v_score := case when v_total = 0 then 0 else round(100.0 * v_correct / v_total) end;

  insert into public.quiz_attempts (student_id, quiz_id, answers, results, correct, total, score, passed, submitted_offline, client_id, client_created_at)
  values (v_uid, p_quiz_id, coalesce(p_answers, '{}'::jsonb), v_results, v_correct, v_total, v_score,
          v_score >= v_quiz.pass_percent, coalesce(p_offline, false), p_client_id, p_client_created_at)
  returning id into v_attempt;

  return v_attempt;
end;
$$;

revoke all on function public.import_unit_package(jsonb) from public, anon;
revoke all on function public.publish_unit(uuid) from public, anon;
revoke all on function public.get_quiz(uuid) from public, anon;
revoke all on function public.submit_quiz(uuid, jsonb, uuid, timestamptz, boolean) from public, anon;
grant execute on function public.import_unit_package(jsonb) to authenticated, service_role;
grant execute on function public.publish_unit(uuid) to authenticated, service_role;
grant execute on function public.get_quiz(uuid) to authenticated;
grant execute on function public.submit_quiz(uuid, jsonb, uuid, timestamptz, boolean) to authenticated;
