-- The content studio builds new paths before students see them: teachers (staff) read draft paths and
-- their levels too. Writing paths and levels stays admin-only.
create policy paths_staff_read on public.paths for select to authenticated using ((select public.is_staff()));
create policy levels_staff_read on public.levels for select to authenticated using ((select public.is_staff()));
