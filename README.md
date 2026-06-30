```
 ██████╗  ██████╗     ██╗   ██╗███╗   ██╗██████╗ ██████╗  ██████╗ ██╗  ██╗███████╗███╗   ██╗
██╔════╝ ██╔═══██╗    ██║   ██║████╗  ██║██╔══██╗██╔══██╗██╔═══██╗██║ ██╔╝██╔════╝████╗  ██║
██║  ███╗██║   ██║    ██║   ██║██╔██╗ ██║██████╔╝██████╔╝██║   ██║█████╔╝ █████╗  ██╔██╗ ██║
██║   ██║██║   ██║    ██║   ██║██║╚██╗██║██╔══██╗██╔══██╗██║   ██║██╔═██╗ ██╔══╝  ██║╚██╗██║
╚██████╔╝╚██████╔╝    ╚██████╔╝██║ ╚████║██████╔╝██║  ██║╚██████╔╝██║  ██╗███████╗██║ ╚████║
 ╚═════╝  ╚═════╝      ╚═════╝ ╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝
```

<div align="center">

**Track. Score. Evolve.**

[![Live](https://img.shields.io/badge/LIVE-gounbroken.app-D4FF3A?style=for-the-badge&labelColor=0A0A0A&color=D4FF3A)](https://gounbroken.app)
[![Version](https://img.shields.io/badge/VERSION-0.9.8-D4FF3A?style=for-the-badge&labelColor=0A0A0A&color=D4FF3A)](https://github.com/brunoaslima/gounbroken/blob/main/CHANGELOG.md)
[![Stack](https://img.shields.io/badge/STACK-React+Supabase-D4FF3A?style=for-the-badge&labelColor=0A0A0A&color=D4FF3A)](#stack)

</div>

---

## WHAT IS THIS

Go Unbroken is a **performance tracking platform** built for CrossFit athletes, weightlifters, and functional fitness practitioners.

Not a generic fitness app. Not a workout logger. A precision tool for athletes who want to understand exactly where they stand — and what it takes to get to the next level.

```
YOUR PR LIST IS SCATTERED ACROSS:

  ✗  WhatsApp messages
  ✗  Notes app
  ✗  Google Sheets
  ✗  Your memory (unreliable)

GO UNBROKEN FIXES THIS.
```

---

## CAPABILITIES

```
┌─────────────────────────────────────────────────────────────┐
│  01 · PRs & INSIGHTS          ████████████████████  LIVE   │
│  02 · TRAINING                ████████████████████  LIVE   │
│  03 · PERSONAL TRAINER        ████████████████████  LIVE   │
│  04 · SOCIAL / COMMUNITY      ░░░░░░░░░░░░░░░░░░░░  SOON   │
│  05 · COMPETITION             ████████████████░░░░  BETA   │
└─────────────────────────────────────────────────────────────┘
```

### 01 · PRs & INSIGHTS
Log every personal record. Track progression over time. Understand your strength level calibrated by bodyweight, sex, and international standards — from Beginner to Elite.

> *"Is my 120 kg back squat good for my weight?"* — Yes. Now you'll know exactly how good.

### 02 · TRAINING
Log WODs, build-up sessions, and accessory work. Full movement library. Score types: For Time, AMRAP, Max Load, Rounds + Reps.

### 03 · PERSONAL TRAINER
Trainers prescribe custom workouts directly to athletes. AI-powered suggestions via GPT-4. Athletes receive, execute, and feed results back — closing the loop.

### 05 · COMPETITION *(beta)*
Full competition management: team registration, WOD publishing, live leaderboard, judge panel, real-time scoring. Public leaderboard accessible without login via `gounbroken.app/competition/:slug`.

---

## STACK

```
FRONTEND          React 18 · Vite 5 · TypeScript (strict) · Tailwind CSS · PWA
BACKEND           Supabase · PostgreSQL · Row Level Security · Edge Functions (Deno)
AUTH              Supabase Auth · Google OAuth · Username login (Edge Function)
AI                OpenAI GPT-4o (workout generation + suggestions)
DEPLOY            Vercel (frontend) · Supabase Cloud (backend)
ANALYTICS         PostHog
```

---

## DESIGN SYSTEM

Brutalist. Dark-first. No compromises.

```
BACKGROUND   #0A0A0A    SURFACE     #111111
BORDER       #2A2A2A    ACCENT      #D4FF3A  ←  the lime
```

- Zero `border-radius` — squares only
- Zero `box-shadow` — flat or nothing
- Zero blur — clarity always
- `Space Grotesk` for headings · `JetBrains Mono` for labels and data
- Labels: ALWAYS `UPPERCASE · MONO · BOLD · TRACKED`

---

## PROJECT STRUCTURE

```
src/
├── pages/          Route-level components (orchestration only)
├── components/     Reusable UI primitives
├── hooks/          Stateful logic (useAuth, useProfile, useScores…)
├── lib/            Pure utilities + Supabase client
supabase/
├── functions/      Edge Functions (Deno)
├── migrations/     SQL migrations (applied via scripts/db-push.sh)
```

---

## LOCAL SETUP

```bash
# 1. Clone
git clone git@github.com:brunoaslima/gounbroken.git
cd gounbroken

# 2. Install
npm install

# 3. Environment
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 4. Run
npm run dev
```

---

## DEPLOY

```bash
# Preview
npx vercel --yes

# Production  (update CHANGELOG.md + bump version first)
npx vercel --prod --yes
```

---

## DATABASE MIGRATIONS

```bash
# Apply a SQL file directly to Supabase
bash scripts/db-push.sh supabase/migrations/your-migration.sql
```

---

## SECURITY MODEL

- **RLS on every table** — users can only read/write their own data
- **SECURITY DEFINER functions** always have `SET search_path = public`
- **Service role key** only used server-side (Edge Functions), never in the frontend
- **Terms acceptance** gated before any protected route — GDPR, LGPD, CCPA compliant

---

## CHANGELOG

Full history in [`CHANGELOG.md`](./CHANGELOG.md).

---

<div align="center">

```
BUILT FOR ATHLETES WHO DON'T STOP.
```

</div>
