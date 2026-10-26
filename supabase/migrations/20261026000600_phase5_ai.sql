-- Phase 5: speaking and writing evaluation, lesson assistant, AI usage and human review.
-- Audio is NEVER stored: only the (redacted) transcript reaches the database.
-- Attempts are written by the server (service role) after the limit check, so students
-- cannot forge scores; they read their own rows.

create table public.speaking_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  prompt_en text not null,
  transcript text not null check (char_length(transcript) <= 5000),
  duration_sec integer not null check (duration_sec between 0 and 600),
  transcription text not null default 'browser' check (transcription in ('browser', 'whisper')),
  status text not null default 'evaluated' check (status in ('evaluated', 'queued', 'failed')),
  scores jsonb,
  feedback jsonb,
  estimated_cefr text,
  provider text,
  model text,
  prompt_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index speaking_attempts_student_idx on public.speaking_attempts (student_id, created_at desc);

create table public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  parent_id uuid references public.writing_submissions (id) on delete set null,
  version smallint not null default 1 check (version between 1 and 20),
  prompt_en text not null,
  text text not null check (char_length(text) <= 6000),
  word_count integer not null check (word_count >= 0),
  status text not null default 'queued' check (status in ('queued', 'evaluated', 'failed')),
  scores jsonb,
  feedback jsonb,
  estimated_cefr text,
  provider text,
  model text,
  prompt_version text,
  client_id uuid,
  evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, client_id)
);
create index writing_submissions_student_idx on public.writing_submissions (student_id, created_at desc);

-- One row per AI call (successful or not). Daily student limits count successful rows.
create table public.ai_usage (
  id bigint generated always as identity primary key,
  day date not null default (now() at time zone 'Asia/Aden')::date,
  student_id uuid references public.profiles (id) on delete set null,
  feature text not null check (feature in ('speaking', 'writing', 'assistant', 'transcription')),
  provider text not null,
  model text not null,
  ok boolean not null,
  error text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_usage_day_idx on public.ai_usage (day, feature);
create index ai_usage_student_idx on public.ai_usage (student_id, day, feature);

-- Monthly human-agreement review of AI feedback (/admin/ai-review).
create table public.ai_reviews (
  id uuid primary key default gen_random_uuid(),
  attempt_type text not null check (attempt_type in ('speaking', 'writing')),
  attempt_id uuid not null,
  reviewer_id uuid references public.profiles (id) on delete set null,
  agrees boolean not null,
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_type, attempt_id, reviewer_id)
);

do $$
declare
  t text;
begin
  foreach t in array array['speaking_attempts', 'writing_submissions', 'ai_usage', 'ai_reviews'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

create policy speaking_attempts_read on public.speaking_attempts for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));
create policy writing_submissions_read on public.writing_submissions for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));
create policy ai_usage_read on public.ai_usage for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));
create policy ai_reviews_admin on public.ai_reviews for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()) and reviewer_id = (select auth.uid()));

-- Free-tier request quota per provider per day (admin editable), for the 70% warning.
insert into public.settings (key, value) values ('ai_daily_quota', '{"groq":1000}')
on conflict (key) do nothing;
