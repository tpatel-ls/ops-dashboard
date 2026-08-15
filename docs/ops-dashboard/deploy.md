# Ops Dashboard - go-live runbook (Supabase + Vercel, free)

Everything here is the **account/key** work that can't be done from code alone.
The app, auth, realtime sync, capture webhook, PWA, and cron are already built and
validated on `main`. Follow these in order.

---

## 1. Create the Supabase project (free)

1. supabase.com → New project (free tier). Pick a region near you. Save the DB
   password.
2. **Settings → API → API keys** (the new keys):
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable** key (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **Secret** key (`sb_secret_…`) → `SUPABASE_SECRET_KEY` (server-only; never `NEXT_PUBLIC_`)

## 2. Apply the schema (CLI - I can run these once you log in)

```bash
# from repo root
npx supabase login                       # interactive (you run this: `! npx supabase login`)
npx supabase link --project-ref <ref>    # <ref> is in your project URL
npx supabase db push                     # applies migrations 0001 through 0008
npx supabase gen types typescript --linked > apps/web/src/lib/database.types.ts
```

`db push` applies the base, operations, library, sync, organizations, food log,
deterministic conflict, and integer-range migrations. The resulting 18 synchronized
tables are added to the `supabase_realtime` publication.

## 3. Create your single user (no public signup)

1. **Authentication → Providers → Email**: enable Email, **turn OFF "Allow new
   users to sign up"** (single-user app).
2. **Authentication → Users → Add user** → your email + a password. Confirm it.
3. (Optional) Copy that user's UUID into `OPS_USER_ID` so the watch webhook
   attributes captures without an admin lookup.

## 4. Local `.env.local` (test before deploying)

Copy the checked-in template and fill only the features you use:

```sh
cp apps/web/.env.local.example apps/web/.env.local
```

The template documents Supabase, Anthropic, watch and cron authentication,
OpenAI-compatible transcription, model overrides, and Pushover settings. Keep
`NEXT_PUBLIC_TRANSCRIBE_ENABLED=0` unless the matching server transcription
variables are configured.

Then `pnpm dev`, open http://localhost:3000 → redirected to `/login` → sign in →
Settings → enable **Sync** → status should read **Live**.

## 5. Deploy to Vercel (free)

```bash
vercel login                     # you run this
vercel link                      # set Root Directory to: apps/web
vercel --prod                    # or via the dashboard
```

- **Root Directory = `apps/web`** (monorepo). `apps/web/vercel.json` defines the
  daily keep-alive cron (`/api/health` at 09:00 UTC) - Hobby allows one daily cron,
  on production only.
- Set every env var from step 4 in **Vercel → Project → Settings → Environment
  Variables** (Production). Add `CRON_SECRET` (any random string) so the cron call
  to `/api/health` is authenticated.

## 6. Point Supabase Auth at the Vercel domain

**Authentication → URL Configuration**:

- **Site URL:** `https://<your-app>.vercel.app`
- **Redirect URLs:** add `https://<your-app>.vercel.app/**`

## 7. Verify end-to-end

- Open the production URL on the **S24 Ultra** and **Tab S10 Ultra** → sign in →
  install to home screen (Chrome menu → Add to Home screen).
- Create a task on one device → it appears on the other within ~2s.
- Watch: wire `docs/ops-dashboard/watch-capture.md`, then speak a capture → it
  shows on phone + tablet live.
- Keep-alive: `GET /api/health` (or wait for the cron) returns `{"ok":true,"db":"up"}`.

## Keys I need from you to finish the live wiring

| Key                                                                                               | For                               | Required?   |
| ------------------------------------------------------------------------------------------------- | --------------------------------- | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL` / `…PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY`                           | sync + auth + webhook             | **yes**     |
| `vercel login` + `npx supabase login`                                                             | apply schema + deploy             | **yes**     |
| `ANTHROPIC_API_KEY`                                                                               | smart triage / journal OCR / chat | recommended |
| `OPS_API_SECRET` (+ `CRON_SECRET`)                                                                | watch webhook + cron auth         | recommended |
| `OPS_USER_ID`                                                                                     | watch attribution shortcut        | optional    |
| `NEXT_PUBLIC_TRANSCRIBE_ENABLED`, `TRANSCRIBE_BASE_URL`, `TRANSCRIBE_API_KEY`, `TRANSCRIBE_MODEL` | voice transcription               | optional    |
| `PUSHOVER_TOKEN` / `PUSHOVER_USER`                                                                | push to phone and watch           | optional    |
