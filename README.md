# Tally

Split expenses with friends, settle up, and stay even. A full-stack capstone
built on top of the [Full Stack Open](https://fullstackopen.com) curriculum.

## Live Deployment
Deployment link: https://tally-one-ivory.vercel.app
## Features

### Core
- Register and log in with email and password (Auth.js v5, bcrypt)
- Create groups and invite people with shareable links
- Add expenses you paid for, split equally, by exact amounts, or by
  percentages — written to Postgres in a single transaction
- Per-member balances and suggested minimal settlements
- Record payments between members and watch balances settle
- Money handled as integer cents — no floating point surprises

### Multi-currency
- Each group settles in a base currency of choice
- Expenses can be in any of 28 currencies; the exchange rate is captured at
  creation so historical balances never drift
- Live rate lookup (Frankfurter/ECB) with a 12-hour cache and an offline
  fallback table; the rate can be overridden per expense
- Conversion rounding is absorbed by the payer, so every expense still nets
  out to exactly zero in the base currency

### Social
- Categorize expenses (12 categories with icons), filter the ledger by
  category, and see per-category totals
- Comment threads on every expense
- Receipt uploads (PNG/JPEG/WebP, max 2 MB) stored as `bytea`, validated by
  magic bytes, and served through a membership-checked route
- An activity feed written transactionally alongside every mutation

### Live and automated
- Realtime group updates: server actions `NOTIFY` a Postgres channel, an SSE
  endpoint `LISTEN`s, and open tabs refresh themselves — no polling, no
  websocket server
- Recurring expenses (weekly/monthly): materialized by a cron endpoint
  (Vercel cron via `vercel.json`) or opportunistically on page load, guarded
  by `SELECT … FOR UPDATE` so an occurrence can never be created twice
- Analytics dashboard: cross-group balances per currency, monthly spend
  trend, category donut, and recent activity — hand-rolled SVG charts with
  zero client JavaScript

### Management
- Admin roles: rename the group, promote or demote admins, remove members
- Members with an unsettled balance cannot leave (or be removed) — settle
  first, then go
- Search the ledger, paginate it, and export it as CSV

## Stack

- [Next.js](https://nextjs.org) (App Router, server actions, TypeScript)
- [Drizzle ORM](https://orm.drizzle.team) + PostgreSQL with SQL migrations
- [Auth.js v5](https://authjs.dev) credentials authentication
- [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS v4
- [Zod](https://zod.dev) validation shared by client and server
- Vitest for unit tests, Playwright for end-to-end tests
- GitHub Actions CI with a real Postgres service container

## Getting started

Requires Node 24+, Docker, and npm.

```bash
npm install
npm run db:up        # start Postgres in Docker
npm run db:migrate   # apply Drizzle migrations
npm run dev          # http://localhost:3000
```

Create a `.env.local` file:

```
DATABASE_URL=postgres://tally:tally@localhost:5432/tally
AUTH_SECRET=<generate with: openssl rand -base64 32>
CRON_SECRET=<optional, protects /api/cron/materialize in production>
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm test` | Run Vitest unit tests (splits, balances, FX, schedules, charts, CSV) |
| `npx playwright test` | Run e2e tests against a dev server with `E2E=1` |
| `npm run db:up` / `db:down` | Start / stop the Postgres container |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Open Drizzle Studio |

The e2e suite resets the database through `/api/testing/reset`, which only
exists when the server runs with `E2E=1`. Browser sessions wiped by the
reset are treated as logged out.

## Deploying

The app runs anywhere Node works. The simplest path is Vercel plus a managed
Postgres (Neon, Supabase, or similar):

1. Push the repo to GitHub and import it into Vercel
2. Set `DATABASE_URL` (pooled connection string) and `AUTH_SECRET` in the
   project's environment variables
3. Set `CRON_SECRET` so the daily recurring-expense job in `vercel.json`
   can run
4. Run `npm run db:migrate` against the production database once
