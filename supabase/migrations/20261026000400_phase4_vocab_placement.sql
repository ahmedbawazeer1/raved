-- Phase 4: vocabulary spaced repetition, placement test, skill estimates.

-- Where the student's curriculum starts (set by the placement test; earlier units stay open).
alter table public.enrollments
  add column if not exists start_unit_id uuid references public.units (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Vocabulary reviews: one row per student and word. Scheduling is computed on the
-- server (src/lib/srs) from the stored state; students only ever touch their own rows.
-- ---------------------------------------------------------------------------
create table public.vocab_reviews (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  vocab_item_id uuid not null references public.vocab_items (id) on delete cascade,
  ease numeric(4, 2) not null default 2.5 check (ease between 1.3 and 5),
  interval_days integer not null default 0 check (interval_days between 0 and 366),
  repetitions integer not null default 0 check (repetitions >= 0),
  lapses integer not null default 0 check (lapses >= 0),
  due_at timestamptz not null default now(),
  last_result text check (last_result in ('again', 'hard', 'good')),
  last_reviewed_at timestamptz,
  review_count integer not null default 0 check (review_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, vocab_item_id)
);
create index vocab_reviews_due_idx on public.vocab_reviews (student_id, due_at);

-- ---------------------------------------------------------------------------
-- Placement. Questions (with answers) are admin-only: students get one question
-- at a time from the server, without the answer.
-- ---------------------------------------------------------------------------
create table public.placement_questions (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.paths (id) on delete cascade,
  item_key text not null,
  level text not null,
  skill text not null check (skill in ('vocab', 'grammar', 'reading', 'listening')),
  position integer not null,
  -- {prompt, text?, listen?, options[]}
  item jsonb not null,
  answer smallint not null check (answer >= 0),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (path_id, item_key)
);

create table public.placement_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  path_id uuid not null references public.paths (id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  -- engine state (src/lib/placement/engine.ts): level, block, answers, currentQuestionId
  state jsonb not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  overall_level text,
  skill_levels jsonb,
  start_unit_id uuid references public.units (id) on delete set null,
  eta_months smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index placement_one_open_attempt on public.placement_attempts (student_id, path_id) where status = 'in_progress';
create index placement_attempts_student_idx on public.placement_attempts (student_id, path_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Skill estimates per student, path and skill: set by placement, raised by quizzes.
-- ---------------------------------------------------------------------------
create table public.skill_estimates (
  student_id uuid not null references public.profiles (id) on delete cascade,
  path_id uuid not null references public.paths (id) on delete cascade,
  skill text not null check (skill in ('vocab', 'grammar', 'reading', 'listening')),
  level text not null,
  source text not null check (source in ('placement', 'quiz')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, path_id, skill)
);

do $$
declare
  t text;
begin
  foreach t in array array['vocab_reviews', 'placement_questions', 'placement_attempts', 'skill_estimates'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- RLS
create policy vocab_reviews_read on public.vocab_reviews for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));
create policy vocab_reviews_insert on public.vocab_reviews for insert to authenticated
  with check (student_id = (select auth.uid()) and (select public.is_active_member())
              and exists (select 1 from public.vocab_items v where v.id = vocab_item_id));
create policy vocab_reviews_update on public.vocab_reviews for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

create policy placement_questions_admin on public.placement_questions for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Attempts are written by the server (service role) after checking the student; students read their own.
create policy placement_attempts_read on public.placement_attempts for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));

create policy skill_estimates_read on public.skill_estimates for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Quizzes raise skill estimates: 80%+ on a skill in a quiz of level L means at least L.
-- ---------------------------------------------------------------------------
create or replace function private.raise_skill_estimates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path uuid;
  v_level text;
  v_level_pos integer;
  r record;
begin
  select l.path_id, l.code, l.position into v_path, v_level, v_level_pos
    from public.quizzes q
    left join public.units u on u.id = q.unit_id
    join public.levels l on l.id = coalesce(q.level_id, u.level_id)
   where q.id = new.quiz_id and l.kind = 'general';
  if v_path is null then
    return new;
  end if;

  for r in
    select x ->> 'skill' as skill,
           count(*) as total,
           count(*) filter (where (x ->> 'correct')::boolean) as correct
      from jsonb_array_elements(new.results) x
     where x ->> 'skill' in ('vocab', 'grammar', 'reading', 'listening')
     group by 1
  loop
    if r.correct::numeric / r.total >= 0.8 then
      insert into public.skill_estimates as e (student_id, path_id, skill, level, source)
      values (new.student_id, v_path, r.skill, v_level, 'quiz')
      on conflict (student_id, path_id, skill) do update
        set level = excluded.level, source = 'quiz'
        where coalesce((select position from public.levels where path_id = v_path and code = e.level), 0) < v_level_pos;
    end if;
  end loop;
  return new;
end;
$$;

create trigger quiz_attempts_raise_skills after insert on public.quiz_attempts
  for each row execute function private.raise_skill_estimates();

-- ---------------------------------------------------------------------------
-- Import a validated placement bank (content/<path>/placement.json). Admin or service role.
-- Questions missing from the file are archived, never deleted (attempts reference them).
-- ---------------------------------------------------------------------------
create or replace function public.import_placement_bank(p_path_slug text, p_bank jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path uuid;
  v_count integer := 0;
  q jsonb;
  ord bigint;
begin
  if not (public.is_admin() or private.is_backend_caller()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select id into v_path from public.paths where slug = p_path_slug;
  if v_path is null then
    raise exception 'path_not_found' using errcode = 'P0002';
  end if;

  for q, ord in select t.q, t.ord from jsonb_array_elements(p_bank -> 'questions') with ordinality as t(q, ord) loop
    insert into public.placement_questions (path_id, item_key, level, skill, position, item, answer, archived)
    values (
      v_path, q ->> 'id', q ->> 'level', q ->> 'skill', ord::integer,
      jsonb_strip_nulls(jsonb_build_object('prompt', q ->> 'prompt', 'text', q ->> 'text', 'listen', q ->> 'listen', 'options', q -> 'options')),
      (q ->> 'answer')::smallint, false
    )
    on conflict (path_id, item_key) do update
      set level = excluded.level, skill = excluded.skill, position = excluded.position,
          item = excluded.item, answer = excluded.answer, archived = false;
    v_count := v_count + 1;
  end loop;

  update public.placement_questions
     set archived = true
   where path_id = v_path and not archived
     and item_key not in (select x ->> 'id' from jsonb_array_elements(p_bank -> 'questions') x);

  insert into public.audit_log (actor_id, action, target, data)
  values ((select auth.uid()), 'placement.import', p_path_slug, jsonb_build_object('questions', v_count));
  return v_count;
end;
$$;

revoke all on function public.import_placement_bank(text, jsonb) from public, anon;
grant execute on function public.import_placement_bank(text, jsonb) to authenticated, service_role;
