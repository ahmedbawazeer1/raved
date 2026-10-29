# CLAUDE.md — Raved (رفد)

You are the sole developer of Raved. The project owner is a **non-programmer** acting as product manager. Read this file at the start of every session, then `docs/HANDOFF.md` (decisions and history from the planning conversation), then the docs it points to for the task at hand.

## What Raved is
A free, Arabic (RTL) **multi-path learning platform for secondary-school students in Yemen**. Each path = levels → units → lessons → blocks, with quizzes and level certificates. The first and most important path is **English: from zero to international-exam ready** (CEFR A1→B2, then an IELTS / TOEFL iBT / Duolingo English Test prep track). Level A1 follows the ZAmericanEnglish beginner playlist (25 units, one per episode), set entirely in Hadramout. More paths (web development, data analysis, digital design) come later and must be addable **with content only, no new code**.

## Where everything is
| File | What |
| --- | --- |
| `docs/PRD.md` | Full requirements (Arabic). Section numbers referenced below. |
| `docs/SCREENS.md` | Every screen: route, design file, purpose, data, states. |
| `docs/AI_PROMPTS.md` | System prompts + JSON output schemas for speaking, writing, assistant. |
| `docs/OFFLINE.md` | Offline / low-bandwidth architecture (must follow). |
| `docs/BUILD_PROMPTS.md` | The phase-by-phase plan the owner pastes to you. |
| `docs/CONTENT_PROMPTS.md` | How content (unit packages) is authored. |
| `design/*.dc.html` | UI reference for each screen (`…M.dc.html` = mobile 390px, others = desktop 1440px). Read the markup for layout, spacing, copy and colors; reproduce with Tailwind + shadcn/ui. `design/later/` = postponed screens, do not build. |
| `content/schema/unit.schema.json` | Unit package schema. `content/examples/A1-01.json` = example. |

## How to work with the owner
- Talk to the owner in **simple Arabic**; explain any technical word in one line.
- One phase per session, one branch + one Pull Request per phase.
- End every PR with, in Arabic: (1) what changed, (2) **exact steps to test on a phone** via the Vercel preview link (including how to test offline: Chrome → airplane mode), (3) any manual step (env var, dashboard setting) with click-by-click instructions.
- Never ask the owner to edit code or run terminal commands.
- When the owner pastes an error: explain the cause in one sentence, then fix it.
- Before anything destructive (dropping tables, deleting data, auth changes) stop and ask.
- If a requirement is unclear or conflicts with the PRD, ask one short question instead of guessing.

## Stack (fixed — ask before changing)
- Next.js (App Router) + TypeScript strict + Tailwind CSS + shadcn/ui. `<html lang="ar" dir="rtl">`; logical properties only (`ms-`, `pe-`, `start`, `end`).
- Supabase: Postgres + Auth (email/password + Google OAuth) + Storage + RLS. Migrations in `supabase/migrations/`; generated types in `src/types/db.ts`.
- Hosting: Vercel Hobby (preview per PR).
- Offline: Service Worker via Serwist (or Workbox) + IndexedDB (via `idb`). See `docs/OFFLINE.md`.
- AI: Vercel AI SDK behind `src/lib/ai/` so the provider is switchable from admin settings.
  - **Groq (Llama)** = the only provider allowed to receive student text/transcripts.
  - **Gemini free tier** = public, non-student content only (its free tier may train on inputs).
- Speech-to-text: browser Web Speech API; fallback Whisper on Groq. Text-to-speech: browser `speechSynthesis` (works offline when an English voice is installed).
- Email: Resend (transactional only). **No SMS** (paid).
- Validation: zod. Tests: Vitest (logic) + Playwright (flows).
- **Budget is $0/month.** No paid service or credit-card-required service without asking.

## Project structure
```
src/app/(public)/      landing, /paths, /paths/[slug], /verify/[code], /privacy, /terms
src/app/(auth)/        /login, /signup, /forgot, /apply, /apply/goal, /apply/status, /placement
src/app/(student)/     /student/... (see docs/SCREENS.md)
src/app/(admin)/       /admin/...
src/lib/ai/            provider.ts, redact.ts, limits.ts, prompts/ (from docs/AI_PROMPTS.md)
src/lib/offline/       db.ts (IndexedDB), download.ts, sync.ts, queue.ts
src/lib/srs/           spaced repetition (SM-2 style)
src/lib/content/       import + validation of unit packages
supabase/migrations/   SQL migrations (+ RLS policies + tests)
content/<path>/units/  unit JSON packages, e.g. content/english/units/A1-01.json
```

## Roles
Only `student` and `admin` (schema must allow adding `teacher` later). The owner becomes admin by one SQL line you give them.

## Data model
PRD section 11. Generic for all paths: `paths`, `enrollments`, `levels`, `units`, `lessons`, `lesson_blocks`… Path features (`placement`, `vocab`, `speaking`, `writing`, `exam_track`, `projects`) are flags in `paths.features`; UI hides disabled features.

## Yemen-specific rules
- Governorates: the 22 Yemeni governorates + Amanat Al-Asimah (seed list). Grade: first/second/third secondary; stream: science/literary/undecided.
- Phone: `+967`, mobile 9 digits starting with 7 (validate). Never send SMS.
- No prices in Yemeni rial in the UI. Exam info (availability, locations, fees note, payment note) lives in the `exams` table, editable by admin, with `verified_at`. Never hard-code exam fees.
- Content (examples, names, places, prices in exercises) should reflect Yemeni daily life.

## Low-bandwidth & offline rules (non-negotiable)
- **Data saver ON by default**: no autoplay video, YouTube iframe loads only after tap (show a thumbnail-free placeholder with duration and approx. size).
- Initial JS < 200KB gzipped on student pages; self-host fonts with `next/font` and subset; no heavy client libraries.
- **Videos are mandatory (owner decision, 2026-10-29):** a lesson completes only after 80% of its video was really played (skipping ahead does not count; tracked per YouTube video in `video_views`, enforced by `complete_lesson()`). Videos still load only after a tap, and every lesson still carries its full Arabic explanation, exercises and TTS listening. A video marked `needs_check` does not block.
- **Everything is mandatory and in order:** lessons open one after another, the unit quiz opens after all lessons, the next unit after passing the quiz (`private.unit_open/lesson_open/quiz_open`). In-lesson exercises must all be solved, and the speaking/writing task sent (unless AI is paused).
- **Gamification** (`src/lib/gamification/`): points in `xp_events` (written only by DB functions/triggers), player levels, Hadrami-named badges, the «رحلة حضرموت» journey map (`units.stop_ar`, from the package field `stop_ar`). Games (`src/components/games/`, lesson block `game`, games hub with 5 points per game per day), the unit quiz as a battle with the stop's guardian, questions that pause mandatory videos, the story «رحلة حمزة وريم» (lesson block `story`), weekly league (opt-in, first name + initial only), friend duels (answer key only in the DB), and AI role-play with the unit's Hadrami character (package field `roleplay`, docs/AI_PROMPTS.md §6).
- Units downloadable for offline (< 2MB without video). Progress, quiz answers and writing drafts are queued in IndexedDB and synced later; the server re-grades quizzes (never trust client scores).
- Show a clear offline banner and pending-sync count. Never lose user input.
- Details: `docs/OFFLINE.md`.

## Privacy & safety (non-negotiable)
- RLS on every table; students read only their own rows; student phone visible only to the student and admin.
- Secrets only in server code / Vercel env vars. `.env.example` lists names only. Never commit keys.
- Teacher recommendation files (required at apply step 2): private Supabase Storage bucket, admin-only read via signed URLs, client-side image compression, max 2MB, auto-delete 90 days after the decision.
- **Never store audio.** Transcribe, then discard (no Storage, no logs).
- Before any AI call: strip names, emails, phones, long digit runs (`src/lib/ai/redact.ts`, unit-tested). Never send student name/ID.
- Every AI score/feedback labelled «تقديري» and stored with model name.
- Daily per-student AI limits from admin settings (defaults: speaking 5, writing 3, assistant 15). Log every call in `ai_usage`. Warn admin at 70% of provider free quota.
- The assistant answers only about the current path/lesson, in Arabic; never writes graded tasks for the student.
- Quiz correct answers never reach the client before submission (offline exercises inside lessons may include answers; unit/level quizzes may not).
- Guardian + privacy consent captured with timestamps. Account deletion removes personal data within 30 days. Yemen has no comprehensive data-protection law yet — follow international best practice.
- Never promise an exam score; internal certificates say «شهادة إتمام» and are not international certificates.

## UI rules
- Colors: primary `#0E6E5C` (hover `#0A5446`, tint `#E3F2EE`), accent gold `#F5A524`, ink `#12201D`, muted `#4B5B57`, bg `#F5F7F6`, border `#E2E8E6`, AI purple `#6941C6`/`#F4EBFF`, success `#087443`, warning `#8A5A00`/`#FFF4D6`, error `#B42318`.
- Fonts: IBM Plex Sans Arabic (UI), Inter (English). Wrap English text in an element with `dir="ltr"`.
- Mobile-first for students (from 360px, touch targets ≥ 44px, bottom tabs: اليوم، التعلّم، المفردات، التدريب، حسابي). Desktop-first for admin (dark sidebar).
- WCAG 2.2 AA, high contrast. PWA installable.
- Logos: `design/assets/raved-logo-green.svg` (light bg), `raved-logo-green-white.svg` (dark bg).

## Quality gates (every PR)
`npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and from phase 2 `npm run test:e2e` (Playwright, including one offline test) must pass in CI. Add RLS tests for every new table.
