-- Owner decision (2026-11-02): the teacher recommendation is no longer required to apply.
-- The columns and the private bucket stay for files already uploaded (purged 90 days after the decision).

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


revoke all on function public.submit_application(boolean, boolean) from public, anon;
grant execute on function public.submit_application(boolean, boolean) to authenticated;
