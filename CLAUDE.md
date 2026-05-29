# CLAUDE.md

Context for AI agents working on **Compass**. This file is authoritative — parts
of `README.md` are historical (written when the app was SQLite-only) and are
flagged at the bottom.

## What this is

A **single-user, personal** life-management PWA: habits, a goal hierarchy,
time-blocked schedule, and push reminders. Designed to be installed to an iPhone
Home Screen. It is **not** multi-tenant — there is one user (the owner) and the
data is theirs alone. Keep that framing when making design decisions.

## Stack

- **Next.js 15** (App Router) + **React 19**, **TypeScript** (strict)
- **Tailwind CSS v4** + shadcn/ui (`components/ui/`)
- **Supabase Postgres** for data; **Supabase Auth** (Google OAuth) for the gate
- `@supabase/ssr` + `@supabase/supabase-js`
- Zustand (client state), Recharts, lucide-react, date-fns, Zod
- `web-push` (VAPID) for notifications
- **pnpm**; deployed on **Vercel**

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server (http://localhost:3000) |
| `pnpm build` | Production build (must pass before deploying) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm vapid` | Generate VAPID keys |
| `pnpm icons` | Regenerate PWA icons from `public/icon.svg` |

The `pnpm db:*` scripts (migrate/seed/studio/reset) are **legacy SQLite** and are
NOT used with Supabase — ignore them for data work.

## Data layer (most important architecture fact)

All data access goes through ONE interface: `Repository` in
[`lib/db/repository.ts`](lib/db/repository.ts). Routes and server components call
`getRepository()` and depend only on the DB-agnostic domain types in
[`lib/types.ts`](lib/types.ts) — they never import a concrete database.

- **Active backend:** `SupabaseRepository` in `lib/db/supabase/` using
  `@supabase/supabase-js` with the **service-role key, server-side only**
  (`lib/db/supabase/client.ts`).
- **Legacy/unused:** `lib/db/sqlite/`, `lib/db/schema.ts` (Drizzle), `drizzle/`,
  and `scripts/` are the old SQLite path. Left in place but NOT wired at runtime.
  Don't edit them to change behavior.
- **Mapping gotchas** (`lib/db/supabase/mappers.ts`): `frequency_config`,
  `reminder_times`, `blocks` are real `jsonb` (native objects/arrays — no
  JSON.parse). Postgres `time` columns return `HH:MM:SS`; the domain type uses
  `HH:MM`, so they're sliced. `created_at` is `timestamptz`.
- IDs are app-generated UUIDs (`newId()`); `created_at` is app-supplied
  (`isoNow()`).
- Updates send only the provided keys (PATCH-style), not read-merge-write.

## Data model

Supabase project **ref `zfasnlsrkglqkzvclceh`** (name "Compass"). Tables:
`domains`, `goals` (life→yearly→monthly→daily tree with progress rollup),
`habits` + `habit_logs` (unique on `habit_id,date`) + derived stats,
`time_blocks` + `block_templates`, `reminders`, `push_subscriptions`,
`settings` (key/value), `health_metrics` (one `double precision` reading per
`(date, metric)`; metric ∈ sleep/weight/steps/resting_hr — Apple Health sync).
FKs use cascade / set-null as in `lib/types.ts`.
**RLS is enabled on every table with NO policies** (see security model below).

## Auth — gate-only (single user)

Login only **gates access**; data is shared/owner-only, NOT scoped per-user.

- [`middleware.ts`](middleware.ts): unauthenticated → redirect to `/login`;
  `/api/*` → `401 {"error":"unauthorized"}`. Static/PWA assets are excluded.
- **Email allowlist** in [`lib/auth/allowed.ts`](lib/auth/allowed.ts), driven by
  `AUTH_ALLOWED_EMAILS` (comma-separated; currently `mdat.main@gmail.com`). Fails
  closed if unset.
- Auth clients (anon/publishable key + cookies, **AUTH ONLY**, separate from the
  service-role data client): `lib/supabase/browser.ts` (login),
  `lib/supabase/server.ts` (callback/signout/read user),
  `lib/supabase/middleware.ts` (session refresh).
- Routes: `app/login/page.tsx`, `app/auth/callback/route.ts` (PKCE exchange +
  allowlist enforcement), `app/auth/signout/route.ts`. Sign-out is in Settings.

### Security model — do not "improve" it

`service_role` bypasses RLS (the server has full access); `anon`/`authenticated`
are denied because there are no policies. This is the intended posture for a
single-user app. **Do NOT** add per-user RLS policies, add `user_id` columns, or
switch the data layer to the anon key — that would break the design. The
service-role key must never reach the browser; only `NEXT_PUBLIC_` (anon) is
client-side. Full multi-tenancy would be a large, separate, explicitly-requested
change.

## Environment variables

Names only — real values live in `.env.local` (gitignored) and in Vercel. Never
commit secrets.

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — server data layer (secret)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — browser auth
- `AUTH_ALLOWED_EMAILS` — login allowlist
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — web push
- `HEALTH_INGEST_TOKEN` — shared secret for `POST /api/health/ingest` (Apple
  Health sync from an iOS Shortcut). Fails closed when unset.
- `DATABASE_PATH` — legacy SQLite, unused

## Deployment

- **GitHub:** `learnberry/compass`, branch `main`.
- **Vercel:** project `compass` (team `matthew-6227s-projects`). Production:
  https://compass-blush-omega.vercel.app . Env vars set for Production +
  Development. Deploy with `vercel deploy --prod` from the linked dir (or push to
  `main` if Git auto-deploy is connected). App routes are `force-dynamic`, so the
  build does not hit Supabase.
- **Dashboard-only config** (not in code, must be set in the providers' UIs):
  - Supabase → Auth → Providers → **Google** enabled with the Google Cloud OAuth
    **Web** client ID + secret.
  - Supabase → Auth → **URL Configuration**: Site URL = the prod URL; Redirect
    URLs include the prod URL `/**` and `http://localhost:3000/**`.
  - Google Cloud OAuth client authorized redirect URI:
    `https://zfasnlsrkglqkzvclceh.supabase.co/auth/v1/callback`.

## Gotchas

- Dates are strings: calendar `YYYY-MM-DD`, clock `HH:MM` (24h), timestamps ISO.
  See the header of `lib/types.ts`.
- `/api/dispatch` (reminder push) is behind the auth gate. If you add a scheduler/
  cron to fire it when the app is closed, add a `CRON_SECRET` bypass.
- `/api/health/ingest` is the ONE route `middleware.ts` lets through without a
  session (the iOS Shortcut has no auth cookie). It enforces its own
  `HEALTH_INGEST_TOKEN` bearer secret instead. Accepts a flat
  (`{date, sleep, weight, steps, restingHr}`) or array (`{metrics:[…]}`) body;
  values are upserted per `(date, metric)`.
- Supabase and Vercel MCP tools are available in this environment for DB and
  deploy operations.

## Historical (do not trust these parts of README.md)

The README's "local-first / all data lives in a local SQLite file" intro, the
`Database: SQLite` stack row, the `pnpm db:migrate`/`db:seed` quick-start, and the
"Switching SQLite → Supabase later" section predate the migration. The migration
is done; this file reflects the current state.
