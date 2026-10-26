-- Phase 1 seed data. Safe to re-run.

insert into public.governorates (code, name_ar, position) values
  ('amanat_al_asimah', 'أمانة العاصمة', 1),
  ('sanaa', 'صنعاء', 2),
  ('aden', 'عدن', 3),
  ('taiz', 'تعز', 4),
  ('hadramawt', 'حضرموت', 5),
  ('ibb', 'إب', 6),
  ('al_hudaydah', 'الحديدة', 7),
  ('dhamar', 'ذمار', 8),
  ('hajjah', 'حجة', 9),
  ('lahij', 'لحج', 10),
  ('abyan', 'أبين', 11),
  ('al_bayda', 'البيضاء', 12),
  ('al_dhale', 'الضالع', 13),
  ('al_jawf', 'الجوف', 14),
  ('al_mahrah', 'المهرة', 15),
  ('al_mahwit', 'المحويت', 16),
  ('amran', 'عمران', 17),
  ('marib', 'مأرب', 18),
  ('raymah', 'ريمة', 19),
  ('saada', 'صعدة', 20),
  ('shabwah', 'شبوة', 21),
  ('socotra', 'أرخبيل سقطرى', 22)
on conflict (code) do update set name_ar = excluded.name_ar, position = excluded.position;

insert into public.paths (slug, title, summary, description, status, position, icon, features, est_months, daily_minutes, published_at) values
  ('english', 'الإنجليزية: من الصفر إلى الشهادة',
   'A1 → B2 ثم IELTS أو TOEFL أو Duolingo',
   '4 مستويات من A1 إلى B2، ثم تدريب على امتحانك الدولي. ابدأ في الأول الثانوي بمعدل 25 دقيقة يومياً لتكون جاهزاً عند التخرج.',
   'published', 1, 'book',
   '{"placement":true,"vocab":true,"speaking":true,"writing":true,"exam_track":true,"projects":false}', 36, 25, now()),
  ('web', 'أساسيات تطوير الويب',
   'HTML و CSS و JavaScript ومشاريع حقيقية',
   'تعلّم بناء صفحات الويب بـ HTML و CSS و JavaScript، مع مشاريع صغيرة تنشرها بنفسك. المسار قيد الإعداد، وسيُفتح بعد استقرار مسار الإنجليزي.',
   'soon', 2, 'code',
   '{"placement":false,"vocab":true,"speaking":false,"writing":false,"exam_track":false,"projects":true}', null, 25, null),
  ('data', 'تحليل البيانات بلغة Python',
   'من الجداول إلى الرسوم البيانية',
   'تعلّم قراءة البيانات وتنظيفها وتحليلها بلغة Python، ثم عرضها في رسوم بيانية واضحة. المسار قيد الإعداد.',
   'soon', 3, 'database',
   '{"placement":false,"vocab":true,"speaking":false,"writing":false,"exam_track":false,"projects":true}', null, 25, null),
  ('design', 'أساسيات التصميم الرقمي',
   'الألوان والخطوط وتصميم الواجهات',
   'تعلّم أساسيات الألوان والخطوط وتصميم واجهات التطبيقات والمواقع. المسار قيد الإعداد.',
   'soon', 4, 'pen',
   '{"placement":false,"vocab":false,"speaking":false,"writing":false,"exam_track":false,"projects":true}', null, 25, null)
on conflict (slug) do nothing;

insert into public.levels (path_id, code, title, description, position, kind, est_hours, planned_units)
select p.id, v.code, v.title, v.description, v.position, v.kind, v.est_hours, v.planned_units
from public.paths p
join (values
  ('english', 'A1', 'البداية', 'التحية، الأرقام، الأسرة، يومك', 1, 'general', 95, 12),
  ('english', 'A2', 'الحياة اليومية', 'التسوق، الطرق، الماضي والخطط', 2, 'general', 100, 16),
  ('english', 'B1', 'الاستقلال', 'آراء، قصص، رسائل، فهم الفيديو', 3, 'general', 185, 20),
  ('english', 'B2', 'الجاهزية', 'نقاش، مقالات، محاضرات قصيرة', 4, 'general', 200, 20),
  ('english', 'IELTS', 'مسار IELTS', 'شكل الأسئلة والاستراتيجيات واختبارات تجريبية موقوتة', 5, 'exam', 70, 10),
  ('english', 'TOEFL', 'مسار TOEFL iBT', 'شكل الأسئلة والاستراتيجيات واختبارات تجريبية موقوتة', 6, 'exam', 70, 10),
  ('english', 'DET', 'مسار Duolingo English Test', 'شكل الأسئلة والاستراتيجيات واختبارات تجريبية موقوتة', 7, 'exam', 60, 8),
  ('web', 'L1', 'بنية الصفحة بـ HTML', '', 1, 'general', null, null),
  ('web', 'L2', 'التنسيق بـ CSS', '', 2, 'general', null, null),
  ('web', 'L3', 'التفاعل بـ JavaScript', '', 3, 'general', null, null)
) as v (path_slug, code, title, description, position, kind, est_hours, planned_units)
  on v.path_slug = p.slug
on conflict (path_id, code) do nothing;

-- Exam facts are NOT verified yet (verified_at null). The admin updates them from settings.
insert into public.exams (code, name, summary, availability_ye, locations, fee_note, payment_note, score_scale, official_practice_url, position) values
  ('ielts', 'IELTS', 'مطلوب لكثير من المنح',
   'يقدمه المجلس الثقافي البريطاني في موقعين في صنعاء',
   'صنعاء · المجلس الثقافي البريطاني', 'الرسوم غير منشورة: اسأل المركز', 'تحقق من طريقة الدفع مع المركز',
   '0–9', 'https://ielts.org/take-a-test/preparation-resources', 1),
  ('toefl', 'TOEFL iBT', 'مطلوب غالباً لأمريكا',
   'اليمن في قائمة ETS، والنسخة المنزلية Home Edition متاحة، ومراكز مثل AMIDEAST عدن',
   'من البيت (Home Edition) أو مركز', 'تحقق من الرسوم الحالية', 'تحقق من إمكانية الدفع من اليمن',
   '1–6', 'https://www.ets.org/toefl/test-takers/ibt/prepare.html', 2),
  ('det', 'Duolingo English Test', 'الأرخص إن قبلته جامعتك',
   'من البيت، يحتاج كمبيوتر وكاميرا واتصالاً مستقراً',
   'من البيت · تحقق من الدفع', 'حوالي 70 دولاراً · تحقق', 'يحتاج بطاقة دولية · تحقق من الدفع من اليمن',
   '10–160', 'https://englishtest.duolingo.com/prepare', 3)
on conflict (code) do nothing;

insert into public.settings (key, value) values
  ('admission_mode', '"review"'),
  ('ai_limits', '{"speaking":5,"writing":3,"assistant":15}'),
  ('ai_provider', '"groq"'),
  ('ai_paused', 'false'),
  ('quota_alert_percent', '70'),
  ('data_saver_default', 'true'),
  ('max_package_bytes', '2097152')
on conflict (key) do nothing;
