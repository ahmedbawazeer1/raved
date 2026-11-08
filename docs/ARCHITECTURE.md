# Raved architecture — built to change

The owner keeps proposing changes and improvements. Everything below exists so that a change lands in
**one place**, reaches **both apps** (web + mobile) when it should, and can be **switched on/off or rolled
back without a new app release**. Read this before structural work.

## 1. The pieces

```
                 ┌──────────────────────────── Supabase (one project) ───────────────────────────┐
                 │ Postgres + RLS · Auth · Storage · DB functions (the "API") · app_config        │
                 └──────────────▲───────────────────────────▲───────────────────────▲───────────┘
                                │                           │                       │ service role
      web (Next.js, Vercel)     │     mobile (React Native) │     «عقل رفد» agent    │ (GitHub Actions)
      src/  — students + admin  │     mobile/ — students    │     src/lib/agent + scripts/agent
                                │                           │
                     shared/  ← pure TypeScript used by both (theme, schemas, Yemen helpers, SRS, config)
```

| Folder      | What lives there                                                                                                  | Rule                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `shared/`   | Logic and data shapes both apps need: `theme.ts`, `yemen.ts`, `apply/` (sign-up schemas), `srs/`, `app-config.ts` | Pure TS + zod only (no React, no Next, no React Native). Unit tested (`*.test.ts`, run by Vitest).                      |
| `src/`      | The web app (Next.js): public pages, student web app, admin, agent UI                                             | Imports shared code as `@shared/...`. Old paths (`@/lib/yemen` …) re-export `shared/` so nothing breaks.                |
| `mobile/`   | The student app (Expo, Expo Router)                                                                               | Screens in `src/app`, UI kit in `src/ui`, data/session in `src/lib`. Imports `@shared/...` (Metro watches `../shared`). |
| `supabase/` | Migrations, RLS tests                                                                                             | Every table: RLS + a test in `supabase/tests/`.                                                                         |
| `android/`  | Temporary TWA wrapper                                                                                             | Removed once the React Native app ships.                                                                                |

## 2. Rules that keep changes cheap

1. **One source of truth per idea.** A rule (phone format, sign-up fields, SRS intervals, colours) is written
   once in `shared/` and imported by both apps. Never copy logic into `mobile/` — move it to `shared/`.
2. **The database is the API.** Anything that must be correct (grading, unlocking, points, permissions) lives in
   DB functions + RLS, not in a client. Both apps call the same functions, so a rule changes in one migration.
3. **Change the API without breaking old apps.** Installed mobile apps can be weeks old. Never rename or remove
   a column or function an app uses: add a new one (`*_v2`), move the apps, then remove the old one in a later
   release. Additive changes only in the same release.
4. **Remote config before code.** `public.app_config` (row `mobile`, see `shared/app-config.ts`) holds feature
   switches, a notice and `min_version` / `latest_version`. New features ship **on**, and the admin can switch
   one off without an app release; an old app version can be forced to update.
5. **Content is data.** Lessons are packages (JSON, validated by `content/schema/unit.schema.json`) rendered by
   block type. A new block type = schema + renderer in each app; an app that does not know a block type skips
   it (never crash on unknown content).
6. **Screens use the UI kit.** Web: Tailwind tokens; mobile: `mobile/src/ui` (Text, Button, Field, Screen) on top
   of `shared/theme.ts`. A design change (font, colour, button style) is one edit.
7. **Features are folders.** New student features go in their own folder (web: `src/components/<feature>`,
   `src/lib/<feature>`; mobile: `src/features/<feature>` when it grows beyond one screen) so they can be changed
   or removed as a unit.
8. **Every change is tested and reversible.** CI runs lint, types, unit tests, DB/RLS tests, e2e (web) and a
   mobile bundle. One PR per change, squash-merged, so any change can be reverted alone.

## 3. How a change reaches students

| Kind of change                                     | How it ships                                      | Time               |
| -------------------------------------------------- | ------------------------------------------------- | ------------------ |
| Content (units, paths, settings, feature switches) | Database / admin panel                            | Instant, both apps |
| Web code                                           | PR → merge → Vercel                               | Minutes            |
| Mobile JS/screens                                  | PR → merge → over-the-air update (`expo-updates`) | Next app start     |
| Mobile native (permissions, icon, SDK upgrade)     | New build → Google Play                           | 1–3 days review    |
| Database rule / function                           | Migration (additive), applied at merge            | Instant, both apps |

## 4. Mobile app specifics

- **Expo SDK 58, Expo Router, Continuous Native Generation:** `mobile/android` and `mobile/ios` are generated
  by `expo prebuild` and never edited or committed; native settings go in `app.json` and config plugins
  (`mobile/plugins/`, e.g. release signing).
- **Same package and key as the TWA** (`com.raved.learn`, secrets `ANDROID_KEYSTORE_B64` /
  `ANDROID_KEYSTORE_PASSWORD`), so installed apps update in place.
- **Versions:** `app.json` `version` (semantic, compared with `app_config.min_version`); `runtimeVersion` policy
  `appVersion`, so over-the-air updates only reach apps with the same native version.
- **RTL:** forced by the `expo-localization` plugin (`forcesRTL`). Text aligns right by default in the UI kit.
- **Auth:** Supabase email/password now; Google sign-in comes with a native config (phase 1b). The app never
  holds a secret key — only the publishable key, like the website.
