# Screens — routes, designs, data, states

Design files are in `design/` (desktop `X.dc.html`, mobile `XM.dc.html`). Copy (Arabic text) in the designs is the intended UI copy unless marked `[...]`.
Every student screen must handle: **loading** (skeleton), **empty**, **error** (Arabic message + retry), **offline** (banner `بلا إنترنت · تقدمك محفوظ` + pending-sync count; disable only what truly needs network).

Access: P = public, A = authenticated (any status), S = active student, AD = admin.

## Public

| Screen (AR) | Route | Design | Access | Content & data | Notes / states |
| --- | --- | --- | --- | --- | --- |
| الرئيسية | `/` | Landing, LandingM | P | Hero, paths cards from `paths` (published first, then soon), «مصممة لظروفك» features, how to start, FAQ | Static + ISR. Very light. |
| كتالوج المسارات | `/paths` | Paths, PathsM | P | All non-draft `paths`, filter all/available/soon, «اقترح مساراً» | |
| صفحة المسار | `/paths/english` (generic `/paths/[slug]` when published) | PathPublic, PathPublicM | P | Path info, levels, unit list of first level (with package size), exams card from `exams` | |
| مسار قريباً | `/paths/[slug]` (status=soon) | PathSoon, PathSoonM | P | Description, planned levels, «أبلغني» → `path_waitlist` (email or logged-in user) | Success toast |
| تسجيل الدخول | `/login` | Login, LoginM | P | Email+password, Google, links to signup/forgot | Rate-limited, Arabic errors |
| إنشاء حساب | `/signup` | Signup, SignupM | P | Google button, name, email, password; link «كيف أنشئ بريد Gmail» | → `/apply` |
| استعادة كلمة المرور | `/forgot` | Forgot, ForgotM | P | Email → Supabase reset email | Success state shown in design |
| التحقق من شهادة | `/verify/[code]` | Verify, VerifyM | P | Lookup `certificates.code`; show first name + last initial, level, date; disclaimer | Not-found state |
| الخصوصية والشروط | `/privacy`, `/terms` | Legal, LegalM | P | Simple-language policy (audio not stored, AI redaction, guardian rights, deletion) | Markdown-driven |
| بلا إنترنت | (fallback page served by service worker) | Offline, OfflineM | P | Links to downloads & vocab (offline-capable) | |

## Onboarding

| Screen | Route | Design | Access | Content & data | Notes |
| --- | --- | --- | --- | --- | --- |
| الالتحاق 1: بياناتك | `/apply` | ApplyData, ApplyDataM | A | birth date, governorate (select), city/district, school, grade, stream, student phone (+967) → `profiles` | Autosave draft each field |
| الالتحاق 2: هدفك | `/apply/goal` | Apply, ApplyM | A | primary path (published paths), target exam (IELTS/TOEFL/DET/undecided), target date, daily minutes, motivation, **required teacher recommendation upload** (photo or PDF ≤ 2MB, compressed in browser, private bucket), printable recommendation template link, 2 consent checkboxes → `applications`, `enrollments` | Submit disabled until recommendation + consents; upload resumable on weak network |
| حالة الطلب | `/apply/status` | Status, StatusM | A | Steps checklist; status pending/approved/needs_changes/rejected; CTA to placement | If admission=auto, skip to placement |
| اختبار تحديد المستوى | `/placement` | PlacementTest, PlacementTestM | A | Adaptive items from `placement_questions`; listening via speechSynthesis; «لا أعرف»; timer; progress | Persist each answer; resume after disconnect |
| نتيجة الاختبار | `/placement/result` | Placement, PlacementM | A | overall level, per-skill bars, start unit, ETA to B2 | CTA: download first unit |

## Student

| Screen | Route | Design | Content & data | Offline |
| --- | --- | --- | --- | --- |
| اليوم | `/student` | StudentHome, StudentHomeM | Today session built from primary enrollment + due vocab; streak; skills summary; goal card; notifications bell | Works from cached session plan |
| مساراتي | `/student/paths` | MyPaths, MyPathsM | enrollments (primary badge), soon paths with «أبلغني» | Read-only cache |
| التعلّم: المستوى والوحدات | `/student/[path]` | Curriculum, CurriculumM | Level tabs, units with state done/now/locked, downloaded chip | Cached |
| صفحة الوحدة | `/student/[path]/unit/[id]` | Unit, UnitM | 7 lessons with state, «يحتاج اتصالاً» tags, progress, download button/size | Full offline when downloaded |
| مشغّل الدرس | `/student/learn/[lessonId]` | Lesson (grammar + assistant), LessonM (listening) | Blocks: text, video (tap-to-load), reading (tap word → meaning), audio (TTS), table, exercise; rating; report error | Yes (except video, assistant) |
| المساعد | panel in lesson / sheet on mobile | Lesson, AssistantM | Chat scoped to lesson, quick chips, remaining count | Needs network; show disabled state |
| مراجعة المفردات | `/student/vocab` | Vocab, VocabM | Due cards, flip, TTS, again/hard/good | Yes, queue results |
| التدريب | `/student/practice` | Practice, PracticeM | Daily limits, this week's tasks, past attempts, offline «listen & repeat» | Listen & repeat offline |
| المحادثة | `/student/speak/[taskId]` | Speaking, SpeakingM | Task, prep timer, record, transcript, rubric scores, 2 corrections, tip, «استمع لنسخة محسّنة» | Needs network; explain clearly |
| الكتابة | `/student/write/[taskId]` | Writing, WritingM | Prompt, editor with word count + local autosave, feedback with numbered corrections, rewrite v2 | Write offline, evaluate when online |
| الاختبار | `/student/quiz/[id]` | Quiz, QuizM | One question per screen, progress, timer, explanation after answer (server-checked) | Offline: answers queued, result after sync |
| نتيجة الاختبار | `/student/quiz/[id]/result` | QuizResult, QuizResultM | Score, per-question review, next unit, review wrong words | — |
| التقدم والامتحان | `/student/progress` | ExamTrack, ExamTrackM | Goal, CEFR timeline, KPIs, skill estimates (تقديري), roadmap, exams-from-Yemen cards (from `exams`) | Cached |
| مسار الامتحان | `/student/exam` | ExamPrep, ExamPrepM | Locked until B1+; exam units, mock tests list with scores, «أنت جاهز» booking guide, record real score | — |
| اختبار تجريبي | `/student/exam/mock/[id]` | MockTest, MockTestM | Timed sections, passage/question split (tabs on mobile), pause | Download before start recommended |
| الشهادات | `/student/certificates` | Certificates, CertificatesM | Certificate card, PDF download (small), copy verify link, next certificate progress | PDF cached |
| الإشعارات | `/student/notifications` | Notifications, NotificationsM | List from `notifications`, mark all read | Cached |
| التنزيلات | `/student/downloads` | Downloads, DownloadsM | Downloaded units (size, outdated→update), download next, storage used, Wi-Fi-only toggle, pending sync + «أرسل الآن» | Core offline screen |
| الإعدادات / حسابي | `/student/settings` | Settings, AccountM | Goal, daily minutes, primary path, data saver, Wi-Fi only, reminders, profile, password, export data, delete account | — |

## Admin

| Screen | Route | Design | Content & data |
| --- | --- | --- | --- |
| لوحة الإدارة | `/admin` | AdminHome, AdminHomeM | KPIs, to-do (applications, units to review, broken links, reports), students per level, AI usage vs quota |
| طلبات الالتحاق | `/admin/applications` | Applications, ApplicationReviewM | List + detail incl. recommendation viewer (signed URL); accept / request changes / reject with note; notification + email |
| المسارات | `/admin/paths` | AdminPaths | Paths table (order, status, units, features, waitlist); edit form (name, slug, status, feature toggles, notify waitlist on publish) |
| استيراد المحتوى | `/admin/content` | ContentImport | Upload/pick unit JSON → validation (errors/warnings in Arabic) → draft; table of units with check + status |
| مراجعة وحدة | `/admin/content/[unit]` | UnitReview | Lessons list with review state, student preview (390px), check notes, per-lesson note, approve, publish, «أعِد لـ Claude بملاحظات» (copies notes as text) |
| الطلاب | `/admin/students` | Students, StudentsM | Search, filters (governorate, level, status), table, CSV export |
| ملف طالب | `/admin/students/[id]` | StudentDetail | Profile (phone masked, reveal logged in `audit_log`), KPIs, activity incl. offline sync, consents, suspend |
| مراجعة تقييمات الذكاء الاصطناعي | `/admin/ai-review` | AIReview | Monthly random sample, redacted text, model scores, agree/disagree + note → `ai_reviews` |
| التقارير والبلاغات | `/admin/reports` | Reports | Retention by week, students by governorate, open reports (error/not useful/broken link), drop-off lessons |
| الإعدادات | `/admin/settings` | AdminSettings | Admission mode, AI daily limits, provider, quota alert %, pause AI, data saver default, max package size, exams info editor |
