-- Remote config for the apps (shared/app-config.ts): feature switches, a notice and the minimum
-- app version. Public to read (the login screen needs it), only admins change it.
create table public.app_config (
  id text primary key check (id in ('mobile')),
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.app_config for each row execute function private.set_updated_at();

alter table public.app_config enable row level security;
create policy app_config_read on public.app_config for select to anon, authenticated using (true);
create policy app_config_admin on public.app_config for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

insert into public.app_config (id, value) values ('mobile', '{"min_version": "1.0.0", "latest_version": "1.0.0", "features": {}, "notice_ar": null}');
