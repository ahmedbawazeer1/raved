-- A1 now follows the ZAmericanEnglish beginner playlist: one unit per episode (25 episodes).
update public.levels l
   set planned_units = 25
  from public.paths p
 where p.id = l.path_id and p.slug = 'english' and l.code = 'A1';
