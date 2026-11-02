-- «عقل رفد»: the platform's content agent. Jobs are queued from the admin panel, run in the
-- background (GitHub Actions, scripts/agent/run.ts with the service role), and wait for the
-- owner's review. Nothing reaches students before an admin approves it.

create table public.agent_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('plan_path', 'build_unit', 'improve_unit')),
  path_id uuid not null references public.paths(id) on delete cascade,
  input jsonb not null default '{}'::jsonb,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'needs_review', 'approved', 'rejected', 'failed')),
  step text,
  progress integer not null default 0 check (progress between 0 and 100),
  log jsonb not null default '[]'::jsonb,
  output jsonb,
  error text,
  model text,
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);
create index agent_jobs_queue on public.agent_jobs (status, created_at);
create index agent_jobs_path on public.agent_jobs (path_id, created_at desc);

-- What the agent learned from the owner's reviews (and rules added by hand). Every prompt
-- includes the active rules of the path.
create table public.agent_memory (
  id uuid primary key default gen_random_uuid(),
  path_id uuid references public.paths(id) on delete cascade,
  text text not null check (char_length(text) between 3 and 1000),
  source text not null default 'review' check (source in ('review', 'manual')),
  job_id uuid references public.agent_jobs(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index agent_memory_path on public.agent_memory (path_id, active);

alter table public.agent_jobs enable row level security;
alter table public.agent_memory enable row level security;

-- Admins only (the runner uses the service role).
create policy agent_jobs_admin on public.agent_jobs for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy agent_memory_admin on public.agent_memory for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Admins queue and review; only the runner (service role) writes results and progress.
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
  -- update by an admin: only the review decision on a finished job
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

create trigger agent_jobs_guard before insert or update on public.agent_jobs
  for each row execute function private.agent_jobs_guard();
