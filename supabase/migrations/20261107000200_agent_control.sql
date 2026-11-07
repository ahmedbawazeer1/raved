-- «عقل رفد»: safety and control. A trace row for every model or search call (what ran, how long,
-- whether it worked), and the owner's pause switch (settings key 'agent_paused').
create table public.agent_traces (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.agent_jobs (id) on delete cascade,
  kind text not null check (kind in ('model', 'search')),
  step text check (step is null or char_length(step) <= 40),
  model text check (model is null or char_length(model) <= 80),
  prompt_version text check (prompt_version is null or char_length(prompt_version) <= 40),
  input_chars integer not null default 0 check (input_chars >= 0),
  output_chars integer not null default 0 check (output_chars >= 0),
  ms integer not null default 0 check (ms >= 0),
  ok boolean not null,
  error text check (error is null or char_length(error) <= 500),
  created_at timestamptz not null default now()
);
create index agent_traces_job_idx on public.agent_traces (job_id, created_at);

alter table public.agent_traces enable row level security;
-- Written only by the runner (service role); admins read.
create policy agent_traces_admin_read on public.agent_traces for select to authenticated using ((select public.is_admin()));

insert into public.settings (key, value) values ('agent_paused', 'false'::jsonb) on conflict (key) do nothing;
