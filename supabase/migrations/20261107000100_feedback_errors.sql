-- Pilot launch (BUILD_PROMPTS phase 7): general feedback from students and a free error log.

-- 1. Feedback: the existing reports table also takes general notes about the app (no lesson).
alter table public.reports drop constraint if exists reports_kind_check;
alter table public.reports add constraint reports_kind_check check (kind in ('error', 'not_useful', 'broken_link', 'feedback'));
alter table public.reports add column if not exists page text check (page is null or char_length(page) <= 200);

-- 2. Error log: written only by the server (service role) from /api/errors; read by admins.
--    No personal data: the message is redacted and cut, the page is a path without query string.
create table public.app_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  source text not null check (source in ('client', 'server')),
  message text not null check (char_length(message) between 1 and 500),
  digest text check (digest is null or char_length(digest) <= 100),
  page text check (page is null or char_length(page) <= 200),
  user_agent text check (user_agent is null or char_length(user_agent) <= 300),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);
create index app_errors_open_idx on public.app_errors (status, created_at desc);

alter table public.app_errors enable row level security;
create policy app_errors_admin_read on public.app_errors for select to authenticated using ((select public.is_admin()));
create policy app_errors_admin_update on public.app_errors for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
