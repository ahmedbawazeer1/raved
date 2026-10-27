-- Phase 6: completion certificates (internal, not international), public verification,
-- weekly YouTube link checks.

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  path_id uuid not null references public.paths (id) on delete cascade,
  level_id uuid not null references public.levels (id) on delete cascade,
  -- Short public code for /verify/[code] (no student id in the URL).
  code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 10)),
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, level_id)
);

create trigger set_updated_at before update on public.certificates for each row execute function private.set_updated_at();
alter table public.certificates enable row level security;

-- Students read their own; only claim_certificates() creates them.
create policy certificates_read on public.certificates for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- A level is complete when it has at least its planned number of published units
-- (at least one) and the student passed the unit quiz of every one of them.
-- ---------------------------------------------------------------------------
create or replace function public.claim_certificates()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_count integer := 0;
  r record;
begin
  if v_uid is null or not public.is_active_member() then
    return 0;
  end if;

  for r in
    select l.id as level_id, l.path_id
      from public.enrollments e
      join public.levels l on l.path_id = e.path_id and l.kind = 'general'
     where e.student_id = v_uid
       and not exists (select 1 from public.certificates c where c.student_id = v_uid and c.level_id = l.id)
       and (select count(*) from public.units u where u.level_id = l.id and u.status = 'published') >= greatest(coalesce(l.planned_units, 1), 1)
       and not exists (
         select 1
           from public.units u
           left join public.quizzes q on q.unit_id = u.id and q.kind = 'unit'
          where u.level_id = l.id
            and u.status = 'published'
            and (q.id is null or not exists (
              select 1 from public.quiz_attempts a where a.quiz_id = q.id and a.student_id = v_uid and a.passed
            ))
       )
  loop
    insert into public.certificates (student_id, path_id, level_id) values (v_uid, r.path_id, r.level_id)
    on conflict (student_id, level_id) do nothing;
    if found then
      v_count := v_count + 1;
      insert into public.notifications (student_id, type, title, body, link)
      values (v_uid, 'certificate', 'حصلت على شهادة إتمام مستوى', 'مبروك! شهادتك جاهزة في صفحة الشهادات.', '/student/certificates');
    end if;
  end loop;
  return v_count;
end;
$$;

-- Public check of a certificate code: first name + last initial, level, path, date. Nothing else.
create or replace function public.verify_certificate(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    -- "أحمد صالح البكري" → "أحمد ب."
    'name', n.parts[1] || case when cardinality(n.parts) > 1 then ' ' || left(n.parts[cardinality(n.parts)], 1) || '.' else '' end,
    'level_code', l.code,
    'level_title', l.title,
    'path_title', pa.title,
    'issued_at', c.issued_at
  )
  from public.certificates c
  join public.profiles p on p.id = c.student_id
  join public.levels l on l.id = c.level_id
  join public.paths pa on pa.id = c.path_id
  cross join lateral (select regexp_split_to_array(btrim(p.full_name), '\s+') as parts) n
  where c.code = upper(btrim(p_code));
$$;

revoke all on function public.claim_certificates() from public, anon;
grant execute on function public.claim_certificates() to authenticated;
revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- One row per YouTube video, kept current by the weekly link check.
create unique index if not exists sources_youtube_id_key on public.sources (youtube_id);
