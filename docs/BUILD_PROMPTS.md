# برومتات البناء — مرحلة بمرحلة

**طريقة الاستخدام:** لكل مرحلة افتح جلسة جديدة في Claude Code على الويب، واختر مستودع `raved`، وانسخ البرومت (الجزء داخل المربع) والصقه كما هو. البرومتات بالإنجليزية لأنها أدق للبرمجة، و Claude يرد عليك بالعربية.

المدة الإجمالية حتى الإطلاق التجريبي: حوالي 14 أسبوعاً بمعدل 10 إلى 15 ساعة أسبوعياً.

---

## المرحلة 0 — الأساس والنشر الأول (أسبوع)

```
Read CLAUDE.md, docs/PRD.md (sections 2, 6, 12, 14, 16), docs/OFFLINE.md and design/Main.dc.html.

Phase 0: an empty but real Raved app deployed on Vercel.
1. Scaffold Next.js (App Router, TypeScript strict, Tailwind, ESLint) at the repo root without touching docs/, design/, content/. Add shadcn/ui.
2. RTL + theme: <html lang="ar" dir="rtl">, IBM Plex Sans Arabic + Inter via next/font (subset), Tailwind tokens from CLAUDE.md, an <En> component for LTR English.
3. Public home page "/" following design/Landing.dc.html and LandingM.dc.html (static data for paths for now). Copy logos from design/assets to public/.
4. PWA: manifest, icons from the logo, theme color, and a service worker (Serwist) that precaches the app shell and an offline fallback page (design/Offline*.dc.html).
5. Scripts: lint, typecheck, test (Vitest), build; GitHub Actions running them on PRs.
6. Supabase client helpers (server + browser) reading env vars; .env.example with names only.
7. Open a PR. In Arabic give me click-by-click steps to: import the repo in Vercel; copy the Supabase URL, anon key and service-role key from the Supabase dashboard; add them in Vercel → Settings → Environment Variables; open the preview on my phone and "Add to Home screen".
Done when: I open the link on my phone, see the home page, and turning on airplane mode shows the offline page instead of an error.
```

---

## المرحلة 1 — البيانات والحسابات والمسارات والالتحاق (أسبوعان)

```
Read CLAUDE.md, docs/PRD.md sections 2, 3, 6, 8.1, 8.2, 11, docs/SCREENS.md (Public + Onboarding + admin Applications/Paths), and the matching design files.

Phase 1:
1. Supabase migrations for: profiles, applications, paths, path_waitlist, enrollments, levels, units, lessons, lesson_blocks, sources, exams, settings, notifications, audit_log. RLS on all; RLS tests.
2. Seed: Yemeni governorates; paths (english=published, web/data/design=soon) with features flags; English levels A1, A2, B1, B2, IELTS, TOEFL, DET with est_hours; exams rows (IELTS: Sana'a, British Council, fee "ask the centre"; TOEFL: Home Edition + AMIDEAST Aden; DET: at home, payment to verify) with verified_at null.
3. Auth: email+password with verification, Google OAuth, password reset (/login, /signup, /forgot) per designs. 30-day sessions.
4. Public: /paths catalog and /paths/[slug] (published → path page; soon → waitlist form).
5. Onboarding: /apply (step 1, Yemeni fields, +967 validation), /apply/goal (step 2 + REQUIRED teacher recommendation upload to a private Storage bucket, image compressed in the browser, ≤ 2MB, plus a printable recommendation template page; + consents with timestamps), /apply/status. Autosave drafts.
6. Admin: /admin layout (dark sidebar), /admin/applications (view recommendation via signed URL; accept / request changes / reject + note → notification + Resend email; scheduled deletion of recommendation files 90 days after decision), /admin/paths (list + edit status/order/features, notify waitlist on publish), /admin/settings (admission mode).
7. Middleware: protect /student/* (active students) and /admin/* (admin).
8. Tell me the one SQL line to make my account admin and exactly where to paste it.
Done when: I sign up on my phone, fill both steps, and accept myself from the admin panel on desktop.
```

---

## المرحلة 2 — المحتوى والدروس والاختبارات (3 أسابيع)

```
Read CLAUDE.md, docs/PRD.md sections 4, 8.4, 8.7, 8.11, 9, docs/SCREENS.md (Student: today, curriculum, unit, lesson, quiz, quiz result; Admin: content import, unit review), content/schema/unit.schema.json, content/examples/A1-01.json, and the matching designs.

Phase 2:
1. `npm run content:check`: validate every content/<path>/units/*.json against the schema + rules (unique ids, vocab 8–15, valid YouTube ids, one correct answer per quiz question, package size < 2MB without video). Run in CI.
2. Admin /admin/content: upload or pick a unit JSON → same validation with Arabic messages → save as draft into units/lessons/lesson_blocks/sources/vocab_items/quizzes/quiz_questions. /admin/content/[unit]: lesson list, student preview at 390px, per-lesson approve + note, publish, "copy notes for Claude".
3. Student: /student (today session from primary enrollment), /student/[path] (levels + units), unit page, lesson player with blocks text/video(tap-to-load, youtube-nocookie)/reading/audio(TTS)/table/exercise, lesson rating + report.
4. Quizzes: unit quiz UI per design, server-side grading only, result page with review and next steps.
5. Playwright: student completes today's lesson and the unit quiz. Import content/examples/A1-01.json as test data.
Done when: I complete a whole unit as a student on my phone.
```

---

## المرحلة 3 — العمل بلا إنترنت (أسبوعان)

```
Read CLAUDE.md and docs/OFFLINE.md carefully (binding), docs/SCREENS.md (Downloads, Offline, offline states), designs Downloads*, Offline*, StudentHomeM (offline banner).

Phase 3: implement docs/OFFLINE.md fully.
1. GET /api/units/[id]/package (student-safe, ETag=version) + IndexedDB stores (units, progress_queue, vocab, drafts, meta) via `idb`.
2. Download/update/delete units; /student/downloads screen; size shown before download; Wi-Fi-only auto-download setting.
3. Every progress event goes through the queue; POST /api/sync (batch, idempotent, server re-grades quizzes); offline banner with pending count; "send now".
4. Lesson player and quiz work from IndexedDB when offline; data saver default ON (no autoplay, video tap-to-load with size).
5. Playwright offline test (download → offline → lesson + quiz → online → server has events + score). Lighthouse mobile ≥ 90 on Slow 3G for /student.
Tell me exactly how to test this on my phone with airplane mode.
Done when: I finish a lesson and a quiz in airplane mode and they appear after reconnecting.
```

---

## المرحلة 4 — المفردات واختبار تحديد المستوى (أسبوعان)

```
Read CLAUDE.md, docs/PRD.md sections 8.3, 8.6, designs Vocab*, PlacementTest*, Placement*.

Phase 4:
1. vocab_reviews + SM-2-style scheduling in src/lib/srs (unit tested). /student/vocab flip cards, TTS, again/hard/good; works offline via the queue.
2. Placement: placement_questions + placement_attempts. Write ~40 ORIGINAL items (A1–B2; vocabulary, grammar, reading, listening via TTS text). Adaptive-lite: start A2, step up/down per block, ~20 min, "I don't know" option, resume after disconnect. Result page per design (overall + per skill + start unit + ETA). Retake every 3 months.
3. skill_estimates updated from placement and quizzes.
Done when: the placement test puts me at a sensible level and vocab review works offline.
```

---

## المرحلة 5 — المحادثة والكتابة والمساعد (أسبوعان)

```
Read CLAUDE.md (privacy rules!), docs/AI_PROMPTS.md (use these prompts and schemas exactly), docs/PRD.md section 8.8, designs Practice*, Speaking*, Writing*, Lesson (assistant), AssistantM.

Phase 5:
1. src/lib/ai: provider wrapper (Groq default), redact.ts (unit tests incl. Yemeni phone formats), limits from settings (speaking 5, writing 3, assistant 15), ai_usage logging, quota alert, graceful Arabic errors, prompt versioning.
2. Speaking: task + prep timer + record (Web Speech API; fallback Whisper on Groq; audio discarded immediately) → evaluation per AI_PROMPTS → UI per design, "تقديري" label, "listen to improved version" via TTS.
3. Writing: editor with word count + local autosave (works offline); evaluate when online (queue if offline); numbered highlights; rewrite v2.
4. Assistant panel/sheet scoped to the lesson.
5. /student/practice hub + offline "listen & repeat".
6. Admin /admin/ai-review: monthly random sample, agree/disagree → ai_reviews.
Done when: I get useful feedback on speaking and writing, and no audio exists anywhere afterwards.
```

---

## المرحلة 6 — اللوحات والحساب والمراجعة الأمنية (أسبوعان)

```
Read CLAUDE.md, docs/PRD.md sections 8.9, 8.11, 13, 15, docs/SCREENS.md (remaining screens), designs ExamTrack*, ExamPrep*, Certificates*, Notifications*, Settings/AccountM, MyPaths*, AdminHome*, Students*, StudentDetail, Reports, AdminSettings, Legal*, Verify*.

Phase 6: build every remaining screen in docs/SCREENS.md except the full exam-prep content:
1. Student: progress (/student/progress), my paths, certificates (small PDF + /verify/[code]), notifications, settings (incl. export my data, delete account), exam track page in its locked state.
2. Admin: dashboard KPIs + AI usage, students list/detail (phone reveal logged), reports (retention, governorates, open reports, drop-off lessons), remaining settings (AI limits, provider, pause AI, data saver default, exams info editor). Weekly YouTube link check (Vercel cron).
3. /privacy and /terms pages from design/Legal.dc.html.
4. Write docs/SECURITY_REVIEW.md: a checklist for a volunteer developer (RLS, env vars, server-only keys, rate limits, input validation, redaction, audio handling, sync endpoint abuse, admin routes) with how to verify each. Fix what you find first.
Done when: the volunteer reviewer signs off with no open issues.
```

---

## المرحلة 7 — الإطلاق التجريبي (مستمر)

```
Read CLAUDE.md. We are launching to 20–30 students from several Yemeni governorates.
1. In-app feedback button (text + optional screenshot) visible to admin.
2. Free error logging to a Supabase table with an admin view.
3. Re-check performance on Slow 3G and a low-end Android; fix top issues.
4. Each week I will paste student feedback; turn it into a prioritized list and fix the top items in one PR.
```

---

## المرحلة 8 — ما بعد الإطلاق

ابدأ كل بند في جلسة منفصلة:

```
Read CLAUDE.md, docs/PRD.md sections 5 and 8.10. Build the IELTS exam track (level IELTS): units explaining each section and question type in our own words, ORIGINAL practice items in the same format, timed mock tests (design MockTest*), readiness rule "two consecutive mocks ≥ target", booking guide from Yemen using the exams table, and recording the real score.
```

بعدها بنفس الأسلوب: مسار TOEFL، ثم Duolingo. ولإضافة **مسار جديد** (مثل تطوير الويب):

```
Read CLAUDE.md and docs/PRD.md section 3. We are adding the path "web" (أساسيات تطوير الويب). Check that everything needed works with content only: path features (vocab=terms, projects), path pages, curriculum, downloads. List anything missing for a non-language path (e.g., a code-exercise block or projects) and implement only what's needed, then tell me in Arabic how to publish the path from /admin/paths.
```
