# 🧭 Compass

A personal life-management **Progressive Web App** — track habits, time-block your
day, climb a goal hierarchy, and get reminders. Built to be added to an iPhone
Home Screen and run as a standalone app with web push notifications.

Single-user, local-first: all data lives in a local SQLite file. The data layer
is hidden behind a repository interface, so moving to Supabase later is a
one-file change.

---

## Features

- **Goal hierarchy** — Life → Yearly → Monthly → Daily goals with automatic
  progress rollups, tagged by life domain (Health, Career, Learning, Business,
  Relationships, Finance, Creative — all configurable).
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
| Database    | SQLite via `better-sqlite3` + Drizzle ORM          |
| State       | Zustand + React state                              |
| Charts      | Recharts · **Icons** lucide-react · **Dates** date-fns |
| Push        | `web-push` (VAPID)                                 |
| Validation  | Zod                                                |

---

## Quick start

**Prerequisites:** Node.js ≥ 20 and [pnpm](https://pnpm.io) ≥ 9.

```bash
pnpm install        # install dependencies (builds the better-sqlite3 native addon)
cp .env.example .env.local
pnpm vapid          # generate VAPID keys — paste the output into .env.local (see below)
pnpm db:migrate     # create ./data/compass.db and apply the schema
pnpm db:seed        # load the starter domains, habits, templates and goals
pnpm dev            # http://localhost:3000
```

Then open <http://localhost:3000>.

> If `pnpm install` prints `Ignored build scripts: better-sqlite3 …`, run
> `pnpm rebuild better-sqlite3` once — the native addon must be compiled.

### Environment variables (`.env.local`)

```bash
VAPID_PUBLIC_KEY=…            # from `pnpm vapid`
VAPID_PRIVATE_KEY=…           # from `pnpm vapid`
VAPID_SUBJECT=mailto:you@example.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=…   # SAME value as VAPID_PUBLIC_KEY
DATABASE_PATH=./data/compass.db
```

`pnpm vapid` runs `web-push generate-vapid-keys`. Copy the **public** key into
*both* `VAPID_PUBLIC_KEY` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, and the **private**
key into `VAPID_PRIVATE_KEY`. Without keys, push silently disables itself and the
app falls back to in-app reminder banners.

---

## npm scripts

| Script              | What it does                                            |
|---------------------|---------------------------------------------------------|
| `pnpm dev`          | Start the dev server                                    |
| `pnpm build`        | Production build · `pnpm start` runs it                 |
| `pnpm typecheck`    | `tsc --noEmit`                                          |
| `pnpm lint`         | ESLint                                                  |
| `pnpm vapid`        | Generate a VAPID key pair                               |
| `pnpm db:generate`  | Generate a Drizzle migration from `lib/db/schema.ts`    |
| `pnpm db:migrate`   | Apply migrations (creates `./data/compass.db`)          |
| `pnpm db:seed`      | Wipe & re-seed the database with starter data           |
| `pnpm db:reset`     | Delete the DB file, then migrate + seed                 |
| `pnpm db:studio`    | Open Drizzle Studio to browse the data                  |
| `pnpm icons`        | Regenerate PWA icons from `public/icon.svg`             |

---

## Installing on an iPhone (PWA)

iOS does not show an install prompt, so add Compass manually:

1. **Serve the app on your network.** Run `pnpm dev` — the terminal prints a
   `Network:` URL like `http://192.168.0.17:3000`. Your iPhone must be on the
   same Wi-Fi.
2. On the iPhone, open that URL in **Safari** (push only works in Safari-based
   installs).
3. Tap the **Share** button → **Add to Home Screen** → **Add**.
4. Launch **Compass** from the Home Screen — it opens full-screen, standalone.

### Enabling push notifications on iOS

iOS 16.4+ only allows web push for PWAs that have been **added to the Home
Screen first**. So:

1. Add Compass to the Home Screen (steps above) and open it from there.
2. Go to **Settings → Notifications** inside the app and tap **Enable
   notifications**; accept the iOS permission prompt.
3. Tap **Send test push** — a notification should arrive within a few seconds.

If push is unavailable or denied, Compass still shows due reminders as an in-app
banner and via the notification bell while the app is open.

> **HTTPS note:** Service workers and push require a secure context.
> `localhost` counts as secure, but a raw LAN IP (`http://192.168.x.x`) does
> not — Safari will install the PWA but block push. For full push testing over
> the LAN, put the dev server behind HTTPS (e.g. a tunnel such as `ngrok`/
> `cloudflared`, or a locally-trusted cert) and use that URL.

---

## Project structure

```
compass/
├─ app/
│  ├─ layout.tsx            # root layout — PWA metadata, providers, SW registration
│  ├─ (app)/                # main app shell (header + bottom nav)
│  │  ├─ layout.tsx
│  │  ├─ page.tsx           # dashboard
│  │  ├─ habits/  schedule/  goals/  review/  settings/
│  └─ api/                  # REST route handlers
├─ components/
│  ├─ ui/                   # shadcn/ui primitives
│  ├─ features/             # dashboard / habits / schedule / goals / review / settings UI
│  ├─ layout/  pwa/  notifications/
├─ lib/
│  ├─ types.ts              # database-agnostic domain types
│  ├─ constants.ts          # default domains, seed habits/goals/templates
│  ├─ api-client.ts         # typed REST client used by the browser
│  ├─ db/
│  │  ├─ repository.ts      # ⭐ the Repository interface + getRepository() factory
│  │  ├─ schema.ts          # Drizzle schema (SQLite)
│  │  └─ sqlite/            # the SQLite implementation of Repository
│  └─ notifications/        # web-push, reminder dispatcher, client hooks
├─ scripts/                 # migrate / seed / generate-icons
├─ drizzle/                 # generated SQL migrations
└─ data/                    # SQLite database file (gitignored)
```

---

## Switching SQLite → Supabase later

The whole app talks to data through one interface — `Repository` in
[`lib/db/repository.ts`](lib/db/repository.ts). Every route handler and server
component calls `getRepository()` and never imports a concrete database. All
methods are already `async`, so an async backend drops straight in.

To migrate:

1. **Add an implementation.** Create `lib/db/supabase/repository.ts` with a
   `SupabaseRepository` class that `implements Repository` (using
   `@supabase/supabase-js`). The method signatures speak only in the types from
   `lib/types.ts` — no SQLite types leak out.
2. **Flip one line.** In `lib/db/repository.ts`, change the factory:

   ```ts
   // export function getRepository(): Repository {
   //   if (!instance) instance = new SqliteRepository();
   instance = new SupabaseRepository();
   ```

That is the **only** edit. `lib/db/schema.ts` (the SQLite Drizzle schema) is
used solely by the SQLite implementation and migrations — recreate the
equivalent tables in Supabase and you are done. Nothing in `app/` or
`components/` changes.

---

## License

Personal project — use it however you like.
# compass
