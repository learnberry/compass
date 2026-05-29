# 🧭 Compass

A personal life-management **Progressive Web App** — track habits, time-block your
day, climb a goal hierarchy, and get reminders. Built to be added to an iPhone
Home Screen and run as a standalone app with web push notifications.

**Single-user.** Data lives in **Supabase (Postgres)**, accessed server-side, and
the whole app sits behind **Google sign-in** restricted to an email allowlist.

> Working on this with an AI agent? See [`CLAUDE.md`](CLAUDE.md) — it's the
> authoritative description of the architecture, auth model, and deploy setup.

---

## Features

- **Goal hierarchy** — Life → Yearly → Monthly → Daily goals with automatic
  progress rollups, tagged by life domain (Health, Career, Learning, Creative,
  Relationships, Finance — all configurable).
- **Habit tracking** — daily / N-times-per-week / specific-weekday habits with
  current & longest streaks, 7d/30d/all-time completion rates, and a
  GitHub-style heatmap. Binary one-tap habits and quantitative ±counter habits
  (e.g. "drink 3 L water", "study 30 min").
- **Time-blocked schedule** — hourly day grid, color-coded by domain, with
  reusable weekday/weekend templates you apply with one tap.
- **Reminders** — per-habit reminder times delivered as iOS-compatible web push
  (VAPID), with a graceful in-app banner fallback. Snooze & complete from the
  notification.
- **Daily dashboard** — today's streaks, quick-tap habit logging, current/next
  time block, top daily goals, a water-intake ring, and a weekly trend.
- **Weekly & monthly review** — completion rates per habit and per domain,
  goal progress, and data viz.
- **PWA** — installable, offline shell, dark mode by default with a light theme.

---

## Tech stack

| Area        | Choice                                             |
|-------------|----------------------------------------------------|
| Framework   | Next.js 15 (App Router) + React 19                 |
| Language    | TypeScript (strict)                                |
| Styling     | Tailwind CSS v4 + shadcn/ui                        |
| Database    | Supabase (Postgres) via `@supabase/supabase-js`    |
| Auth        | Supabase Auth — Google OAuth via `@supabase/ssr`   |
| State       | Zustand + React state                              |
| Charts      | Recharts · **Icons** lucide-react · **Dates** date-fns |
| Push        | `web-push` (VAPID)                                 |
| Validation  | Zod                                                |
| Hosting     | Vercel                                             |

---

## Quick start

**Prerequisites:** Node.js ≥ 20, [pnpm](https://pnpm.io) ≥ 9, and a Supabase
project with the Compass schema already applied.

```bash
pnpm install
cp .env.example .env.local   # then fill in the values (see below)
pnpm vapid                   # generate VAPID keys → paste into .env.local
pnpm dev                     # http://localhost:3000
```

Open <http://localhost:3000> — you'll be redirected to `/login` to sign in with
Google.

### Environment variables (`.env.local`)

```bash
# Supabase data layer — server only, bypasses RLS, NEVER expose to the browser
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=…

# Supabase Auth (browser) — publishable/anon key, safe to expose
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=…

# Who may sign in (comma-separated Google emails)
AUTH_ALLOWED_EMAILS=you@example.com

# Web push (from `pnpm vapid`)
VAPID_PUBLIC_KEY=…
VAPID_PRIVATE_KEY=…
VAPID_SUBJECT=mailto:you@example.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=…   # SAME value as VAPID_PUBLIC_KEY
```

### Google sign-in setup (Supabase + Google Cloud)

Auth is configured in dashboards, not in code:

1. **Google Cloud Console** → create an OAuth 2.0 **Web application** client.
   Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
2. **Supabase** → Authentication → Providers → **Google**: enable it and paste the
   client ID + secret.
3. **Supabase** → Authentication → URL Configuration: set **Site URL** and add the
   app origins to **Redirect URLs** (e.g. `http://localhost:3000/**` and your
   production URL `/**`).

Only emails in `AUTH_ALLOWED_EMAILS` are allowed in; everyone else is signed out.

---

## npm scripts

| Script              | What it does                                            |
|---------------------|---------------------------------------------------------|
| `pnpm dev`          | Start the dev server                                    |
| `pnpm build`        | Production build · `pnpm start` runs it                 |
| `pnpm typecheck`    | `tsc --noEmit`                                          |
| `pnpm lint`         | ESLint                                                  |
| `pnpm vapid`        | Generate a VAPID key pair                               |
| `pnpm icons`        | Regenerate PWA icons from `public/icon.svg`             |

---

## Architecture

All data access goes through a single interface — `Repository` in
[`lib/db/repository.ts`](lib/db/repository.ts). Route handlers and server
components call `getRepository()` and depend only on the database-agnostic domain
types in [`lib/types.ts`](lib/types.ts); they never import a concrete client. The
active implementation is `SupabaseRepository` ([`lib/db/supabase/`](lib/db/supabase))
using the **service-role key, server-side only**.

Auth is **gate-only**: there are no per-user columns and data is the owner's.
[`middleware.ts`](middleware.ts) redirects unauthenticated requests to `/login`
and returns `401` for `/api/*`. Row Level Security is enabled on every table with
**no policies** — the service role bypasses RLS (the server has full access) while
the public anon key is denied. See [`CLAUDE.md`](CLAUDE.md) for the full rationale.

### Project structure

```
compass/
├─ middleware.ts            # auth gate (redirect to /login, 401 for /api)
├─ app/
│  ├─ layout.tsx            # root layout — PWA metadata, providers, SW registration
│  ├─ login/               # sign-in page (Continue with Google)
│  ├─ auth/                # OAuth callback + sign-out route handlers
│  ├─ (app)/                # main app shell (header + bottom nav)
│  │  ├─ page.tsx           # dashboard
│  │  └─ habits/  schedule/  goals/  review/  settings/
│  └─ api/                  # REST route handlers
├─ components/
│  ├─ ui/                   # shadcn/ui primitives
│  ├─ features/             # dashboard / habits / schedule / goals / review / settings UI
│  ├─ layout/  pwa/  notifications/
├─ lib/
│  ├─ types.ts              # database-agnostic domain types
│  ├─ api-client.ts         # typed REST client used by the browser
│  ├─ auth/                 # email allowlist
│  ├─ supabase/             # auth clients (browser / server / middleware)
│  ├─ db/
│  │  ├─ repository.ts      # ⭐ the Repository interface + getRepository() factory
│  │  └─ supabase/          # the Supabase implementation (client, mappers, repository)
│  └─ notifications/        # web-push, reminder dispatcher, client hooks
└─ scripts/                 # generate-icons
```

The database schema is managed in Supabase (project migrations), not in this repo.

---

## Deployment (Vercel)

Hosted on Vercel. Set every variable from `.env.local` (except they come from the
Vercel project, not the file) for the **Production** environment, then deploy:

```bash
vercel deploy --prod
```

App routes are `force-dynamic`, so the build never reaches out to Supabase.
After the first deploy, add the production URL to Supabase → Authentication → URL
Configuration (Site URL + Redirect URLs) so Google sign-in works in production.

> **Note:** `/api/dispatch` (reminder push) is behind the auth gate. If you add a
> scheduler/cron to fire it while the app is closed, give it a `CRON_SECRET`
> bypass.

---

## Installing on an iPhone (PWA)

iOS does not show an install prompt, so add Compass manually:

1. **Serve the app over HTTPS.** Push requires a secure context — `localhost`
   counts, but a raw LAN IP does not. For LAN/device testing use a tunnel
   (`ngrok`/`cloudflared`) or the deployed URL.
2. On the iPhone, open the URL in **Safari** (push only works in Safari installs).
3. Tap **Share** → **Add to Home Screen** → **Add**.
4. Launch **Compass** from the Home Screen — it opens full-screen, standalone.

### Enabling push notifications on iOS

iOS 16.4+ only allows web push for PWAs **added to the Home Screen first**:

1. Add Compass to the Home Screen and open it from there.
2. **Settings → Notifications** inside the app → **Enable notifications**; accept
   the iOS prompt.
3. Tap **Send test push** — a notification should arrive within a few seconds.

If push is unavailable or denied, Compass still shows due reminders as an in-app
banner and via the notification bell while the app is open.

---

## License

Personal project — use it however you like.
