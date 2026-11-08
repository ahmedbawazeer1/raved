-- «مصنع المحتوى» (content factory), stage 1: the teacher role, the path profile, video sources,
-- lesson/unit templates and the level map. Everything that makes a path different is data here, so the
-- same factory builds any path (owner decision 2026-11-08: "we build a system, not one-time content").

-- ---------------------------------------------------------------------------
-- 1. Staff = the admin or an active teacher (volunteer reviewer). Teachers build and review content;
--    only the admin approves maps and publishes units. The admin adds teachers by email.
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin', 'teacher') and status <> 'suspended'
  );
$$;

create or replace function public.set_teacher(p_email text, p_teacher boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_role text;
begin
  if not public.is_admin() then
    raise exception 'admins_only';
  end if;
  select id, role into v_id, v_role from public.profiles where lower(email) = lower(trim(p_email)) limit 1;
  if v_id is null then
    raise exception 'no_account';
  end if;
  if v_role = 'admin' then
    raise exception 'is_admin';
  end if;
  update public.profiles
     set role = case when p_teacher then 'teacher' else 'student' end,
         status = case when p_teacher then 'active' else status end
   where id = v_id;
  insert into public.audit_log (actor_id, action, target, data)
  values (auth.uid(), case when p_teacher then 'teacher.add' else 'teacher.remove' end, v_id::text, '{}'::jsonb);
  return v_id;
end;
$$;
revoke all on function public.set_teacher(text, boolean) from public, anon;
grant execute on function public.set_teacher(text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. The path profile («ملف المسار»): levels (framework, video language, unit template, ordering
--    playlist), video rules and quality criteria. Shape validated in src/lib/factory/profile.ts.
-- ---------------------------------------------------------------------------
create table public.path_profiles (
  path_id uuid primary key references public.paths (id) on delete cascade,
  profile jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.path_profiles for each row execute function private.set_updated_at();
alter table public.path_profiles enable row level security;
create policy path_profiles_staff_read on public.path_profiles for select to authenticated using ((select public.is_staff()));
create policy path_profiles_admin_insert on public.path_profiles for insert to authenticated with check ((select public.is_admin()));
create policy path_profiles_admin_update on public.path_profiles for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Trusted video sources, searched in order before any general search. Teachers curate them.
create table public.video_sources (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.paths (id) on delete cascade,
  kind text not null check (kind in ('playlist', 'channel')),
  ref text not null check (ref ~ '^(PL[A-Za-z0-9_-]{10,40}|UC[A-Za-z0-9_-]{22}|@[A-Za-z0-9._-]{3,60})$'),
  title text not null check (char_length(title) between 2 and 120),
  language text not null check (language in ('ar', 'en')),
  levels text[] not null default '{}',
  position integer not null default 100,
  active boolean not null default true,
  notes text check (notes is null or char_length(notes) <= 300),
  added_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (path_id, kind, ref)
);
create trigger set_updated_at before update on public.video_sources for each row execute function private.set_updated_at();
alter table public.video_sources enable row level security;
create policy video_sources_staff_read on public.video_sources for select to authenticated using ((select public.is_staff()));
create policy video_sources_staff_insert on public.video_sources for insert to authenticated with check ((select public.is_staff()));
create policy video_sources_staff_update on public.video_sources for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy video_sources_staff_delete on public.video_sources for delete to authenticated using ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- 3. Templates: what a lesson and a unit are made of (src/lib/factory/templates.ts). The admin edits
--    them; a change applies to units built afterwards, never to published ones.
-- ---------------------------------------------------------------------------
create table public.content_templates (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('lesson', 'unit')),
  key text not null check (key ~ '^[a-z][a-z0-9_]{1,40}$'),
  title_ar text not null check (char_length(title_ar) between 2 and 80),
  description_ar text not null default '' check (char_length(description_ar) <= 600),
  spec jsonb not null,
  active boolean not null default true,
  version integer not null default 1,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, key)
);
create trigger set_updated_at before update on public.content_templates for each row execute function private.set_updated_at();
alter table public.content_templates enable row level security;
create policy content_templates_staff_read on public.content_templates for select to authenticated using ((select public.is_staff()));
create policy content_templates_admin_insert on public.content_templates for insert to authenticated with check ((select public.is_admin()));
create policy content_templates_admin_update on public.content_templates for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- 4. The level map («خريطة المستوى»): planned once per level, then units are built one by one from it.
-- ---------------------------------------------------------------------------
create table public.curriculum_levels (
  level_id uuid primary key references public.levels (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'planning', 'review', 'approved')),
  summary_ar text not null default '' check (char_length(summary_ar) <= 1500),
  issues jsonb not null default '[]'::jsonb,
  job_id uuid references public.agent_jobs (id) on delete set null,
  teacher_ok_by uuid references public.profiles (id) on delete set null,
  teacher_ok_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.curriculum_levels for each row execute function private.set_updated_at();

create table public.curriculum_items (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.levels (id) on delete cascade,
  kind text not null check (kind in ('objective', 'grammar', 'word')),
  code text not null check (code ~ '^[A-Za-z0-9_.-]{1,40}$'),
  text_en text not null default '' check (char_length(text_en) <= 200),
  text_ar text not null default '' check (char_length(text_ar) <= 300),
  detail jsonb not null default '{}'::jsonb,
  unit_code text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (level_id, kind, code)
);
create index curriculum_items_unit_idx on public.curriculum_items (level_id, unit_code);
create trigger set_updated_at before update on public.curriculum_items for each row execute function private.set_updated_at();

create table public.curriculum_units (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.levels (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{1,10}-[0-9]{2}$'),
  position smallint not null check (position between 1 and 60),
  title_en text not null check (char_length(title_en) between 2 and 80),
  title_ar text not null check (char_length(title_ar) between 2 and 80),
  stop_ar text not null check (char_length(stop_ar) between 2 and 40),
  situation_ar text not null check (char_length(situation_ar) between 5 and 300),
  task_ar text not null check (char_length(task_ar) between 5 and 300),
  objectives text[] not null default '{}',
  grammar text[] not null default '{}',
  review_words text[] not null default '{}',
  source_video jsonb,
  build_status text not null default 'planned' check (build_status in ('planned', 'building', 'review', 'approved', 'failed')),
  unit_id uuid references public.units (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (level_id, position)
);
create trigger set_updated_at before update on public.curriculum_units for each row execute function private.set_updated_at();

-- Only the admin approves a map; once approved, only the admin (or the factory) changes it.
create or replace function private.guard_curriculum_level()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_privileged_session() or public.is_admin() then
    return new;
  end if;
  if new.status = 'approved' and old.status is distinct from 'approved' then
    raise exception 'admins_only';
  end if;
  if new.approved_by is distinct from old.approved_by or new.approved_at is distinct from old.approved_at then
    raise exception 'admins_only';
  end if;
  if old.status = 'approved' then
    raise exception 'map_locked';
  end if;
  return new;
end;
$$;
create trigger guard_curriculum_level before update on public.curriculum_levels
  for each row execute function private.guard_curriculum_level();

create or replace function private.guard_curriculum_rows()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_level uuid := coalesce(new.level_id, old.level_id);
begin
  if private.is_privileged_session() or public.is_admin() then
    return coalesce(new, old);
  end if;
  if exists (select 1 from public.curriculum_levels where level_id = v_level and status = 'approved') then
    raise exception 'map_locked';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger guard_curriculum_items before insert or update or delete on public.curriculum_items
  for each row execute function private.guard_curriculum_rows();
create trigger guard_curriculum_units before insert or update or delete on public.curriculum_units
  for each row execute function private.guard_curriculum_rows();

alter table public.curriculum_levels enable row level security;
alter table public.curriculum_items enable row level security;
alter table public.curriculum_units enable row level security;
create policy curriculum_levels_staff_read on public.curriculum_levels for select to authenticated using ((select public.is_staff()));
create policy curriculum_levels_admin_insert on public.curriculum_levels for insert to authenticated with check ((select public.is_admin()));
create policy curriculum_levels_staff_update on public.curriculum_levels for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy curriculum_items_staff_all on public.curriculum_items for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy curriculum_units_staff_all on public.curriculum_units for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- 5. The agent: a new job kind that plans a level map; teachers can follow jobs.
-- ---------------------------------------------------------------------------
alter table public.agent_jobs drop constraint if exists agent_jobs_kind_check;
alter table public.agent_jobs add constraint agent_jobs_kind_check check (kind in ('plan_path', 'build_unit', 'improve_unit', 'plan_level'));
create policy agent_jobs_staff_read on public.agent_jobs for select to authenticated using ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- 6. Seeds: the default templates, the English path profile and its first trusted source.
-- ---------------------------------------------------------------------------
insert into public.content_templates (kind, key, title_ar, description_ar, spec) values
  ('lesson', 'vocab', 'درس مفردات', 'يعرّف بكلمات الوحدة في موقفها الحضرمي بفيديو وجدول وجمل، ثم يثبّتها بالتمارين والألعاب.', '{"skill":"vocab","est_minutes":15,"sections":[{"key":"warmup","title_ar":"قبل أن نبدأ","block":"text","source":"model","phase":"activate","guide_en":"2–3 short Arabic lines that set the unit''s Hadramout scene and ask the student what they already know or would say in it. No new English yet."},{"key":"watch","title_ar":"شاهد","block":"video","source":"video","phase":"demonstrate","guide_en":"A 2–8 minute part of a video that teaches or uses this lesson''s new words, with 2–3 surprise questions about what was just said."},{"key":"words","title_ar":"الكلمات","block":"table","source":"model","phase":"demonstrate","guide_en":"A table of the unit''s new words: English | Arabic meaning | a short example sentence from the unit''s situation."},{"key":"in_context","title_ar":"الكلمات في الموقف","block":"audio","source":"model","phase":"demonstrate","guide_en":"6–10 short English sentences (read aloud by the app) that use every new word in the unit''s situation, in order."},{"key":"practice","title_ar":"تدرّب","block":"exercise","source":"code","phase":"apply","count":[4,6],"kinds":["mcq","fill_blank"],"guide_en":"Generated from the words and the in-context sentences: meaning choice and fill the missing word."},{"key":"game","title_ar":"العب","block":"game","source":"code","phase":"apply","kinds":["match","listen","flashcards"],"guide_en":"One vocabulary game with the unit''s words."}]}'::jsonb),
  ('lesson', 'grammar', 'درس قاعدة', 'فيديو يشرح القاعدة، ثم شرح بالعربية بأمثلة من الموقف، وتمارين ترتيب وإكمال.', '{"skill":"grammar","est_minutes":15,"sections":[{"key":"notice","title_ar":"لاحظ","block":"audio","source":"model","phase":"activate","guide_en":"3–4 English sentences from the unit''s situation that contain the grammar point (read aloud)."},{"key":"watch","title_ar":"شاهد","block":"video","source":"video","phase":"demonstrate","guide_en":"A 2–8 minute part of a video that explains this grammar point, with 2–3 surprise questions."},{"key":"rule","title_ar":"القاعدة","block":"text","source":"model","phase":"demonstrate","guide_en":"Explain the grammar point in simple Arabic (markdown): when we use it, the form, and the most common mistake of Arabic speakers. Use the sentences above and from the video as examples."},{"key":"form","title_ar":"الصيغة","block":"table","source":"model","phase":"demonstrate","guide_en":"A small table of the form (e.g. subject | verb | example)."},{"key":"practice","title_ar":"تدرّب","block":"exercise","source":"code","phase":"apply","count":[4,6],"kinds":["order_words","fill_blank","mcq"],"guide_en":"Generated from the grammar example sentences: put the words in order, fill the form, choose the right form."},{"key":"write","title_ar":"اكتب","block":"writing_task","source":"model","phase":"integrate","optional":true,"guide_en":"A 2–3 sentence writing task about the student''s own life in Hadramout using the grammar point."}]}'::jsonb),
  ('lesson', 'dialogue', 'درس حوار', 'مقطع محادثة، ثم حوار قصير في الموقف بين شخصيات حضرمية، أسئلة فهم، ومهمة تحدث.', '{"skill":"listening","est_minutes":15,"sections":[{"key":"before","title_ar":"قبل الاستماع","block":"text","source":"model","phase":"activate","guide_en":"One Arabic line: who is talking, where, and what to listen for."},{"key":"watch","title_ar":"شاهد","block":"video","source":"video","phase":"demonstrate","guide_en":"A 1–6 minute part of a video with a real conversation in a similar everyday situation, with 2–3 surprise questions."},{"key":"dialogue","title_ar":"الحوار","block":"story","source":"model","phase":"demonstrate","guide_en":"A 6–10 line dialogue in the unit''s situation between Hadrami characters (speaker, text_en, text_ar). Uses the new words and the grammar point; nothing above the level."},{"key":"check","title_ar":"هل فهمت؟","block":"exercise","source":"code","phase":"apply","count":[3,4],"kinds":["true_false","mcq"],"guide_en":"Generated from the dialogue lines: who said it, true or false."},{"key":"speak","title_ar":"تحدّث","block":"speaking_task","source":"model","phase":"integrate","guide_en":"A speaking task: the student plays one role of the dialogue in their own words (30–60 seconds)."}]}'::jsonb),
  ('lesson', 'review', 'درس مراجعة', 'مقطع مراجعة، حلقة من قصة حمزة وريم تجمع الوحدة، تمارين مختلطة، ومهمة حقيقية.', '{"skill":"review","est_minutes":18,"sections":[{"key":"watch","title_ar":"شاهد","block":"video","source":"video","phase":"demonstrate","guide_en":"A 2–8 minute part of a video that reviews the unit''s language, or an authentic scene in a similar situation, with 2–3 surprise questions."},{"key":"story","title_ar":"رحلة حمزة وريم","block":"story","source":"model","phase":"activate","guide_en":"An episode of the story «رحلة حمزة وريم» at the unit''s stop: 6–10 panels (speaker, text_en, text_ar) using the unit''s words, grammar and 2–3 review words from earlier units."},{"key":"mixed","title_ar":"مراجعة مختلطة","block":"exercise","source":"code","phase":"apply","count":[5,8],"kinds":["mcq","fill_blank","order_words","true_false"],"guide_en":"Generated from all of the unit''s sentences and words, including review words."},{"key":"game","title_ar":"تحدي السرعة","block":"game","source":"code","phase":"apply","kinds":["speed","memory","spell"],"guide_en":"One fast game with all of the unit''s words."},{"key":"task","title_ar":"المهمة","block":"speaking_task","source":"model","phase":"integrate","guide_en":"The unit''s real-world task (from the curriculum) as a speaking task set in Hadramout."}]}'::jsonb),
  ('unit', 'standard', 'الوحدة القياسية', 'مفردات ← قاعدة ← حوار ← مراجعة، كل درس بفيديو، ثم اختبار الوحدة.', '{"lessons":[{"template":"vocab"},{"template":"grammar"},{"template":"dialogue"},{"template":"review"}],"objectives":[2,4],"new_words":[8,12],"review_words":[2,4],"quiz":{"min":8,"max":10,"pass_percent":70}}'::jsonb)

on conflict (kind, key) do nothing;

insert into public.path_profiles (path_id, profile)
select id, '{
  "levels": [
    {"code": "A1", "framework": "cefr", "video_language": "ar", "unit_template": "standard", "source_playlist": "PLp22-4PivYmIFAnru_L7fnMhSV5YffLTZ",
     "notes_ar": "وحدة لكل حلقة من قائمة ZAmericanEnglish للمستوى الأول، بالترتيب."},
    {"code": "A2", "framework": "cefr", "video_language": "ar", "unit_template": "standard"},
    {"code": "B1", "framework": "cefr", "video_language": "en", "unit_template": "standard"},
    {"code": "B2", "framework": "cefr", "video_language": "en", "unit_template": "standard"},
    {"code": "IELTS", "framework": "exam", "video_language": "en", "unit_template": "standard"},
    {"code": "TOEFL", "framework": "exam", "video_language": "en", "unit_template": "standard"},
    {"code": "DET", "framework": "exam", "video_language": "en", "unit_template": "standard"}
  ],
  "video": {"min_sec": 60, "max_sec": 480, "captions_required": true, "candidates": 3},
  "quality": {"criteria": ["يطابق أهداف الوحدة", "اللغة ضمن المستوى", "وضوح الشرح العربي", "البيئة اليمنية والقيم", "جودة الخيارات الخاطئة", "الفيديو يخدم الدرس"], "min_score": 4}
}'::jsonb
from public.paths where slug = 'english'
on conflict (path_id) do nothing;

insert into public.video_sources (path_id, kind, ref, title, language, levels, position, notes, added_by)
select id, 'playlist', 'PLp22-4PivYmIFAnru_L7fnMhSV5YffLTZ', 'ZAmericanEnglish — المستوى الأول', 'ar', '{A1}', 1,
       'كورس شامل لتعلم الإنجليزية من الصفر، 25 حلقة', null
from public.paths where slug = 'english'
on conflict (path_id, kind, ref) do nothing;
