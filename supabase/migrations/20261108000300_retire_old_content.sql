-- Owner decisions (2026-11-08): the content factory replaces the one-shot unit builder, and no existing
-- unit is merged into it. So the old builder's open jobs are closed (kept for the record, not deleted),
-- and the units built before the factory are hidden from students (status back to draft, nothing deleted).
update public.agent_jobs
   set status = 'rejected',
       review_note = 'أُغلقت: استُبدل البناء القديم بمصنع المحتوى (قرار المالك 2026-11-08).',
       finished_at = coalesce(finished_at, now())
 where kind in ('build_unit', 'improve_unit')
   and status in ('queued', 'running', 'needs_review', 'failed');

update public.units set status = 'draft' where status in ('published', 'review');
