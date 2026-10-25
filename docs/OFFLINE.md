# Offline & low-bandwidth architecture

Students in Yemen face slow, expensive, unstable internet and long power cuts. Raved must stay useful offline. This document is binding for every phase.

## Goals
1. A downloaded unit can be studied completely in airplane mode (except speaking evaluation, the assistant, and optional videos).
2. No user input is ever lost: progress, exercise answers, quiz answers, vocab reviews, writing drafts.
3. Pages are light: student pages < 200KB gzipped JS on first load; text renders before anything heavy.

## Building blocks
- **Service worker** (Serwist recommended for Next.js App Router; Workbox acceptable):
  - Precache the app shell, fonts (subset), icons, and the offline fallback page (`design/Offline*.dc.html`).
  - Runtime cache: `StaleWhileRevalidate` for student pages' data (today plan, curriculum, notifications); `NetworkOnly` for AI endpoints and auth.
  - Never cache admin pages or anything containing other students' data.
- **IndexedDB** (via `idb`), database `raved`, stores:
  - `units` — key `unitId@version`, value: the published unit package (JSON) minus server-only fields (unit/level quiz answers).
  - `progress_queue` — events `{id (uuid), type, payload, client_created_at}` where type ∈ `lesson_progress | exercise_answer | quiz_submission | vocab_review | writing_draft | lesson_rating | report`.
  - `vocab` — due cards snapshot + local SRS state for offline reviews.
  - `drafts` — writing drafts by taskId (autosave every few seconds).
  - `meta` — last sync time, data-saver flag, downloaded sizes.

## Download flow
1. Unit page / Downloads screen shows the size (from `units.package_size_bytes`) before download.
2. `GET /api/units/[id]/package` returns the student-safe package (no quiz answers) with `ETag` = version.
3. Store in IndexedDB; record in `downloads` table when online.
4. If a newer version exists, mark «قديمة · حدّث» and download only on tap (or automatically on Wi-Fi if the setting is on; detect with `navigator.connection` when available, otherwise treat as metered).

## Sync flow
1. Every user action writes to `progress_queue` first, then attempts the network call.
2. On `online` event, app start, and every few minutes while online: flush queue in order via `POST /api/sync` (batch, idempotent by event `id`).
3. Server validates each event against RLS + business rules, **re-grades quizzes server-side**, ignores client scores, and returns results (e.g., quiz score) which update local state and create notifications.
4. UI shows pending count in the offline banner and on the Downloads screen; «أرسل الآن» triggers a flush.
5. Conflict rule: server state wins for scores; for progress, take the furthest state; for drafts, keep both versions if the server has a newer one.

## Data saver (default ON)
- YouTube embeds use `youtube-nocookie.com`, load only after tap, show duration and approximate size; no thumbnails auto-loaded.
- Images lazy, small, WebP/AVIF; no decorative images on student pages.
- Listening exercises use device TTS (`speechSynthesis`) from text, so they cost no data. If no English voice is installed, show the transcript and a short tip.

## Testing (required)
- Playwright e2e: download a unit → set context offline → complete a lesson + quiz → go online → assert server has the events and the score.
- Lighthouse mobile ≥ 90 on `/student` with network throttled to "Slow 3G".
- Manual check by owner on a real low-end Android phone in airplane mode before merging phases 3+.
