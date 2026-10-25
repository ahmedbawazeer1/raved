# HANDOFF — context from the planning conversation

This file carries everything decided in the planning conversation (claude.ai) into Claude Code. Read it together with `CLAUDE.md` at the start of the first session. The owner speaks Arabic and is not a programmer.

## 1. How we got here (short history)
1. The owner shared a prototype of «رفد» (an educational platform). We analysed it, then planned a rebuild **from scratch**.
2. v1 plan: digital-skills paths (web, data, design) with teachers, projects, an AI path-builder agent. → **Archived.**
3. Owner decisions that changed the plan:
   - Remove the teacher role (only `student` + `admin`).
   - Content is not generated inside the app; it is authored by Claude in separate sessions as JSON unit packages, then reviewed by admin. Zero API cost.
   - Brand colors: **green + gold** (option B) for the existing logo.
   - Focus now on **English**: a complete path from zero to an international certificate (IELTS / TOEFL / Duolingo) by the end of secondary school.
   - The owner cannot program, will build with Claude Code, and has **almost no budget** (target $0/month).
   - Correction: the audience is **students in Yemen** (not Egypt), and Raved is a **multi-path platform** where English is the most important path now; other paths come later.
   - Registration asks for the **student's own phone** (no guardian phone). Guardian *consent* checkbox is kept (most students are minors).
   - **Teacher recommendation is mandatory** at apply step 2 (photo or PDF ≤ 2MB, private bucket, admin-only, deleted 90 days after the decision).
   - The GitHub repo was made **public** → never commit secrets; enable secret scanning + push protection.

## 2. Final decisions (source of truth = docs/PRD.md v3)
- Multi-path model: path → levels → units → lessons → blocks; feature flags per path.
- English: A1 (12 units) → A2 (16) → B1 (20) → B2 (20) → exam track (IELTS first, then TOEFL, then DET). v1 launches with A1 + A2 content.
- No default exam. Facts found (need verification before launch):
  - IELTS: British Council Yemen, two venues in Sana'a; fees not published.
  - TOEFL iBT: Yemen is on ETS list; Home Edition available; centres such as AMIDEAST Aden listed.
  - Duolingo English Test: not on the published unavailable list (only Iran); availability and payment from Yemen unverified.
- Offline-first & low bandwidth are core (docs/OFFLINE.md). Data saver ON by default; video optional.
- AI: Groq (Llama) only for student text; Gemini only for public content; daily limits speaking 5 / writing 3 / assistant 15; audio never stored; redaction before every call.
- Stack: Next.js + TypeScript + Tailwind + shadcn/ui, Supabase, Vercel Hobby, Resend, Serwist + IndexedDB.
- Yemen has no comprehensive personal-data-protection law yet (a draft was being prepared with UN ESCWA support) → follow international best practice.

## 3. Deliverables and where they live
| Deliverable | Location |
| --- | --- |
| PRD v3 (living doc, Arabic) | https://claude.ai/artifact/RWvyi1oQBb1aeFPCFnaBxn — exported copy: `docs/PRD.md` |
| UI/UX design canvas (89 boards: 81 v1 desktop + mobile, 8 postponed) | https://claude.ai/artifact/8eosHeVKS94CCJZDHKjjNL — source files: `design/` |
| Screen map (routes ↔ designs ↔ data ↔ states) | `docs/SCREENS.md` |
| Offline architecture | `docs/OFFLINE.md` |
| AI prompts + output schemas | `docs/AI_PROMPTS.md` |
| Phase prompts 0–8 | `docs/BUILD_PROMPTS.md` |
| Content prompts | `docs/CONTENT_PROMPTS.md` |
| Unit schema + example | `content/schema/unit.schema.json`, `content/examples/A1-01.json` |
| Owner's Arabic guide | `docs/GUIDE_AR.md` |
| Older docs (archived, do not follow) | PRD v1 https://claude.ai/artifact/Qx9F2GrN3m9VBQPFw9anBf · PRD v2 https://claude.ai/artifact/5y17j7Dy3aAuB1B7NEe9kc |

The artifact links are private to the owner; Claude Code cannot open them. Use the copies in this repo.

## 4. Not included on purpose
- The original prototype is in `archive/prototype/` **without** its `.env.local` (it contained a real Gemini API key). If the owner ever uploaded the original zip publicly, that key must be revoked in Google AI Studio. Older PRDs are in `archive/prd/`. Do not build from `archive/`.
- `design/later/` = postponed screens (community, AI path builder, projects) — reference only.

## 5. Current status & next step
- Accounts: owner is creating GitHub (done, public repo `raved`), Vercel, Supabase (region Frankfurt, Free), Groq.
- Next: **Phase 0** in `docs/BUILD_PROMPTS.md`.
- In parallel later: content authoring from week 3; verify exam facts in Yemen; find a volunteer English teacher and a volunteer security reviewer.

## 6. Open questions (ask the owner when relevant)
- Exam fees/locations/payment methods from Yemen (IELTS Sana'a, TOEFL centres, DET/TOEFL Home payment).
- Admission mode: manual review (default) or automatic?
- Second path after English (web development?).
- Pilot cohort: who, which governorates.
- Domain name or stay on `raved.vercel.app`.

## 7. Working style the owner expects
- Reply in simple Arabic, step by step, click-by-click for any dashboard action.
- One phase per session and per PR; give phone test steps (including airplane mode from phase 3).
- Never ask the owner to write code or run terminal commands.
