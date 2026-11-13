# Tally

Split expenses with friends, settle up, and stay even. A full-stack capstone
built on top of the [Full Stack Open](https://fullstackopen.com) curriculum.

## Features

- Register and log in with email and password (Auth.js v5, bcrypt)
- Create groups and invite people with shareable links
- Add expenses you paid for, split equally, by exact amounts, or by
  percentages — written to Postgres in a single transaction
- Per-member balances and suggested minimal settlements
- Record payments between members and watch balances settle
- Money handled as integer cents — no floating point surprises

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
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm test` | Run Vitest unit tests (split, balance, money math) |
| `npx playwright test` | Run e2e tests against a dev server with `E2E=1` |
| `npm run db:up` / `db:down` | Start / stop the Postgres container |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Open Drizzle Studio |

The e2e suite resets the database through `/api/testing/reset`, which only
exists when the server runs with `E2E=1`.

## Deploying

The app runs anywhere Node works. The simplest path is Vercel plus a managed
Postgres (Neon, Supabase, or similar):

1. Push the repo to GitHub and import it into Vercel
2. Set `DATABASE_URL` (pooled connection string) and `AUTH_SECRET` in the
   project's environment variables
3. Run `npm run db:migrate` against the production database once
