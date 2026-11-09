-- Avatar items unlock with real progress: arena wins and monthly championships come from the server.

-- Last month's champions per level and title (league members only).
create or replace function private.month_champions(p_from timestamptz, p_to timestamptz)
returns table (level text, title text, student_id uuid, value bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with people as (
    select p.id, private.student_level(p.id) as level,
           (select coalesce(sum(x.points), 0) from public.xp_events x where x.student_id = p.id and x.created_at >= p_from and x.created_at < p_to) as drops,
           (select count(distinct (x.created_at at time zone 'Asia/Aden')::date) from public.xp_events x
             where x.student_id = p.id and x.created_at >= p_from and x.created_at < p_to) as days,
           (select count(*) from public.arena_runs r where r.student_id = p.id and r.won and r.finished_at >= p_from and r.finished_at < p_to) as wins
      from public.profiles p
     where p.role = 'student' and p.status = 'active' and p.league_opt_in
       and exists (select 1 from public.xp_events x where x.student_id = p.id and x.created_at >= p_from and x.created_at < p_to)
  )
  select distinct on (level, title) level, title, id, value from (
    select level, 'drops' as title, id, drops as value, drops as tie from people where drops > 0
    union all
    select level, 'watering', id, days, drops from people where days > 0
    union all
    select level, 'arena', id, wins, drops from people where wins > 0
  ) t
  order by level, title, value desc, tie desc, id;
$$;

create or replace function private.last_month()
returns table (m_from timestamptz, m_to timestamptz)
language sql
stable
set search_path = ''
as $$
  select (date_trunc('month', now() at time zone 'Asia/Aden') - interval '1 month') at time zone 'Asia/Aden',
         (date_trunc('month', now() at time zone 'Asia/Aden')) at time zone 'Asia/Aden';
$$;

create or replace function public.monthly_champions()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_from timestamptz;
  v_to timestamptz;
  v_out jsonb;
begin
  if (select auth.uid()) is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select m_from, m_to into v_from, v_to from private.last_month();
  select coalesce(jsonb_object_agg(level, t), '{}'::jsonb) into v_out
    from (
      select c.level, jsonb_object_agg(c.title, jsonb_build_object('name', private.short_name(p.full_name), 'avatar', p.avatar, 'value', c.value)) as t
        from private.month_champions(v_from, v_to) c join public.profiles p on p.id = c.student_id
       group by c.level
    ) s;
  return jsonb_build_object('month', to_char(v_from at time zone 'Asia/Aden', 'YYYY-MM'), 'levels', v_out);
end;
$$;

-- The student's own arena wins and whether they were ever a monthly champion (checked for last month).
create or replace function public.my_avatar_progress()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_from timestamptz;
  v_to timestamptz;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select m_from, m_to into v_from, v_to from private.last_month();
  return jsonb_build_object(
    'games_won', (select count(*) from public.arena_runs where student_id = v_uid and won),
    'champion', exists (select 1 from private.month_champions(v_from, v_to) c where c.student_id = v_uid));
end;
$$;

revoke all on function public.my_avatar_progress() from public, anon;
grant execute on function public.my_avatar_progress() to authenticated;
