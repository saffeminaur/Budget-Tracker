# Budget Tracker

A personal budget tracker built with Next.js (App Router) and Supabase, installable as
a PWA. Tracks five accounts — MariBank savings, DBS daily spending, money others
owe you (Receivables), HSBC investments, and a Mendaki loan — and shows a net worth
dashboard.

## Stack

- Next.js 16 (App Router, Server Actions, `proxy.ts` — the current name for what
  used to be `middleware.ts`)
- Supabase: Postgres + Auth (email/password) + Row Level Security
- Tailwind CSS + shadcn/ui
- Hand-rolled PWA support (manifest, icons, minimal service worker) — no `next-pwa`

## One-time Supabase setup

1. **Run the schema.** In the Supabase dashboard, open **SQL Editor → New query**,
   paste the contents of `supabase/schema.sql`, and run it. This creates all 7
   tables and their Row Level Security policies (every row is scoped to
   `auth.uid()`, so only you can ever read or write your data).
2. **Create your login.** Go to **Authentication → Users → Add user** and create
   the one account you'll sign in with (email + password). This app has no public
   sign-up page by design — it's single-user.
3. **Get your API keys.** In **Project Settings → API**, copy the **Project URL**
   and the **anon / public** key.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in the two Supabase values
npm run dev
```

Open http://localhost:3000 and sign in with the user you created in Supabase.

## Environment variables

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon/public key |

Both are safe to expose client-side — that's what the `anon` key is for. Row Level
Security is what actually protects your data, not keeping this key secret.

## Deploying to Vercel

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. In Vercel, **Add New → Project**, import the repo. Next.js is auto-detected.
3. Add the two environment variables above under **Project Settings →
   Environment Variables** (for Production, Preview, and Development).
4. Deploy. No other configuration is needed.

## Installing on an iPhone home screen

Open the deployed URL in Safari → Share → **Add to Home Screen**. The app installs
with its own icon and launches full-screen (no Safari chrome), backed by
`app/manifest.ts` and the icons in `public/icons/`.

## Regenerating icons

Icons are generated from vector shapes (no external image assets) via:

```bash
node scripts/generate-icons.mjs
```

This regenerates everything in `public/icons/`. Edit `scripts/generate-icons.mjs`
to change the design.

## Project structure

- `app/(app)/` — authenticated pages (dashboard + the 5 account pages), behind
  `app/(app)/layout.tsx` which enforces auth and renders the bottom nav
- `app/login/` — sign-in page
- `actions/` — Server Actions, one file per account, all re-verify the session
- `lib/supabase/` — browser client, server client, and the `requireUser()` DAL helper
- `proxy.ts` — refreshes the Supabase session cookie and redirects unauthenticated
  requests to `/login` (optimistic check only — RLS and per-action auth checks are
  the real boundary)
- `supabase/schema.sql` — full schema + RLS policies
