# Changelog — Go Unbroken

All production-relevant changes are documented here.
Entry format: `Capability → Feature: description`
Version format: `## [version] — YYYY-MM-DD`

---

## [1.5.5] — 2026-07-25

### Training → Workout scan: scan via IA (Claude vision)

- New "Scan IA (mais preciso)" option next to the existing camera/gallery scan (now labeled "Scan rápido (offline)") in the manual workout creation sheet
- Sends the photo to a new Supabase Edge Function (`scan-workout-photo`), which uses Claude vision to read and structure the workout (movements, sets, reps, load, format type, rounds, time caps) in one call — instead of raw Tesseract OCR text
- Result lands pre-filled in the existing section builder for review/edit before saving — same save path as manual/OCR entry, no new UI
- Restricted to accounts with the `ai`/`admin` role (same gate as the weekly plan generator); rate-limited to 20 scans/day per user via `ai_usage_log`
- Photo is resized and re-encoded client-side before upload, capping payload size and stripping EXIF metadata
- Tesseract OCR pipeline is unchanged — still the offline/fast option

---

## [1.5.4] — 2026-07-17

### Admin → Claude usage: per-feature cost breakdown by user

- "Top users by cost" now shows a breakdown chip per AI feature under each user (e.g. `SCAN-WORKOUT-PHOTO · 2 · $0.0955  GENERATE · 4 · $0.0481`) instead of just a single total
- `admin_get_ai_usage_by_user` RPC now returns one row per user×function; grouped client-side into per-user totals + breakdown
- Fixed `admin_get_ai_usage_by_user`'s SQL: an `ORDER BY` window function referenced a pre-aggregation column, causing a 400 error — moved the aggregation into a CTE so the window function operates on already-grouped rows
- Fixed a second, unrelated bug found while verifying this: `admin_get_ai_usage_recent` was live with a stale 5-column signature referencing `tokens_used`, a column removed when it was split into `input_tokens`/`output_tokens` — the correct definition was already committed in `ai_usage_log.sql` but had never actually been applied to the database, so "Recent calls" silently rendered empty
- Admin AI usage load errors are now logged to console instead of being swallowed by `data ?? []`

---

## [1.5.3] — 2026-07-09

### Competition → WOD: MAX LOAD multi-component scoring

- Admin/head judge can define up to 8 named components on a MAX LOAD WOD (e.g., Strict Press, Back Squat, Deadlift)
- "+ ADD COMPONENT" button appears in the WOD creation form when score type is MAX LOAD
- JudgePanel shows one KG input per component when a multi-component WOD is selected
- Each input auto-saves to localStorage (`draft_{comp}_{wod}_{team}`) — no data lost if the app is closed mid-entry
- Running total is displayed live once all fields are filled
- Submit button is disabled until every component has a value (zero is valid)
- On submit: `score_numeric = sum of all components`; `raw_result = "Strict Press: 80 · Back Squat: 100 · Deadlift: 120 = 300kg"`
- localStorage draft is cleared after successful submission
- DB: `competition_wods.components TEXT[]` column; `create_competition_wod` RPC updated to accept optional `p_components`

### Competition → Leaderboard: QR code sharing, gated visibility, zero-score handling

- Competition detail page: "QR" button (visible once the competition is `in_progress`) opens a printable QR code linking to the public leaderboard, with an A4 print layout
- Leaderboard now stays hidden (with a "Not available yet" screen) for non-privileged viewers until the competition is `in_progress` or `finished` — admins and personals can preview it earlier
- Teams without a submitted score no longer show a rank/medal, points, or a tie-break highlight — those are reserved for teams with an actual result
- Rank-change arrows no longer fire for teams that still have zero points
- Head judges/admins can now open the Judge Panel and view the leaderboard from the competition detail page regardless of status
- `PUBLISH RESULTS` button on the WOD results tab renamed to `PUBLISH WOD` (clearer — it publishes the whole WOD, not an individual result)

---

## [1.5.2] — 2026-07-08

### PRs → Onboarding: alphabetical exercise list

- "First PR" step now displays exercises in alphabetical order (previously followed insertion order of groups)

### Athlete → Profile: full redesign (option 1B — Dashboard Grid)

- Compact identity block: 44px avatar + name + role badge + `@username` on two lines
- **Strength Level hero**: segmented 6-tier bar (Foundation → World Class), headline "You're in the top X% of humanity.", strongest/focus category, confidence footnote; empty state when < 2 PRs across distinct categories
- **Physical Data** with icon per row (email, weight, height, age, gender); edit pencil in header → `/onboarding`
- **Tools** as vertical list of rows with colored icon + title + subtitle + chevron; `#141414` background on section headers
- Bell icon in TopBar → `/athlete/invites`; `InviteSection` kept below tools

### Timer → EMOM: configurable interval

- EMOM interval is now configurable (E2MOM, E90s, etc.) — previously fixed at 1 minute
- Config reuses `workSeconds` field; `TimerDisplay` shows the real interval (e.g. `2M`, `90S`)
- TimerConfig shows Interval stepper + Rounds stepper + total duration preview

### Timer → Config: 5s increment on −/+ buttons

- `−` and `+` buttons in the time stepper now increment/decrement by 5s (was 15s)

---

## [1.5.1] — 2026-07-08

### Training → WorkoutCard + WorkoutImportSheet: A/B part display within a section

- Sections with `A. ...` / `B. ...` pattern (2+ parts) are auto-detected and rendered with a visual separator — lime `PART A` / `PART B` label with 2px lime left border, `#2A2A2A` horizontal divider between parts
- Logic centralized in `splitIntoParts()` exported from `WorkoutNotesRenderer.tsx` — shared with `WorkoutPreview` in the import sheet (preview synced with display, per BUG_PATTERNS)
- Sections without A/B pattern continue rendering normally — no backwards compatibility breakage

---

## [1.5.0] — 2026-07-07

### Auth → Sign-up: date of birth + nationality required

- **Date of Birth** and **Nationality** (flag + name, 193 countries) fields moved to the sign-up form — collected at registration, no longer in onboarding
- `signUpBasic` receives `date_of_birth` and `nationality`; values saved to the `profiles` table (RLS) — never in `user_metadata` (JWT), per BUG_PATTERNS #21
- Nationality selector as a bottom sheet: 6 popular countries (BR, US, GB, PT, ES, AR) + search across 193 countries; lime highlight on selected row
- Front-end validations: DOB in 10–100 year range; nationality required
- DB constraints: `nationality ~ '^[A-Z]{2}$'` and `avatar_url LIKE 'https://%'` (migration `onboarding-v3.sql`)

### Onboarding → Step 2: profile photo

- New "Profile photo" step with hero copy: _"The leaderboard has your name. Now give it a face."_
- Client-side compression before upload: max 600px · WebP 85% → ~150–300 KB
- Public `avatars` storage bucket created via migration; RLS: each user can only write/delete in their own `{userId}/` folder
- Step is optional — "Skip" button in TopBar
- DOB removed from "Your numbers" step (now only asks gender, weight, height)

### Onboarding → Per-step persistence + resume

- Each "Next" click persists `onboarding_step` to the DB — if the user closes the app mid-onboarding, they resume at the correct step on reopen
- Total steps: 6 (Welcome · Photo · Physical · Training · First PR · Done)
- Column `onboarding_step INT NOT NULL DEFAULT 0` added to `profiles`
- Fields `nationality TEXT`, `avatar_url TEXT`, `training_types TEXT[]` added to the `Profile` type

---

## [1.4.7] — 2026-07-06

### Athlete → Report: fix stale WRAPPED route

- `WRAPPED` button navigated to `/wrapped(/:athleteId)` instead of `/athlete/wrapped(/:athleteId)` — a leftover from before the `/athlete` prefix refactor. On mobile it fell through to the catch-all route → `/home` → redirected to `/login` (desktop-only gate), so the button silently kicked the user out instead of opening the annual summary

### QA → E2E Playwright: coverage for Build-up, Timer, Invites, Report/Wrapped and Admin

- `tests/buildup.spec.ts`: movement selection + warm-up ladder calculation + below-bar weight validation
- `tests/timer.spec.ts`: switching between 6 timer modes + full start/pause/resume/reset cycle
- `tests/invites.spec.ts`: pending team invite in inbox, accept and transition to history
- `tests/report.spec.ts` / `tests/admin.spec.ts`: empty state + monthly report navigation, WRAPPED button, role gate, tabs and search in admin panel
- `tests/helpers/seedRoles.ts`: generic `ensureRole`/`revertRole` helper to grant and revert temporary roles to the QA account (reused by report and admin)
- `training.spec.ts` fixed: stale routes and selectors (pre-i18n) + `AddScore.tsx` had "Save PR"/"Save Time" buttons hidden behind the fixed BottomNav (same pattern as BUG_PATTERNS.md #7)

---

## [1.4.6] — 2026-07-06

### Code Quality → Multiple: CodeRabbit fixes

- Training → WorkoutImportSheet: restore `sectionNotes` in edit prefill — notes with `obs:` suffix no longer duplicated on re-save
- Training → WorkoutImportSheet: add `aria-label` to sets number input
- Training → Unbroken: `deleteSet` now returns `{ error }` like `addSet`, surfaces RLS/network failures instead of silently proceeding
- Competition → CompetitionManage: extract `broadcastResult()` helper that calls `removeChannel` after send — prevents stale channel accumulation on repeated judge actions
- Competition → JudgePanel: same channel cleanup after broadcast
- Home → Headlines: fix unreachable no-data fallback (`pool.length < 5` → `!hasData`)

---

## [1.4.5] — 2026-07-06

### Competition → Leaderboard Realtime: fix latency/missing events

- Root cause: RLS policy `"results: anon read published"` only allows SELECT where `status = 'published'`. Supabase Realtime evaluates RLS before emitting `postgres_changes` to the subscriber — so anon viewers never received WAL events for results in `submitted` status (inserted by judges), causing 10-30s latency or no event at all
- Fix 1: removed the `filter: competition_id=eq.${id}` from the `postgres_changes` subscription — combining a column filter with RLS causes the Realtime server to run two separate evaluation passes, compounding latency; since the callback only triggers a refetch (no payload used), receiving events from other competitions is harmless
- Fix 2: added a Broadcast channel `score:<competition_id>` — judge (JudgePanel) and admin (CompetitionManage) send a zero-payload broadcast after every `submit_competition_result`, `override_competition_result`, and `publish_wod_results` call; Leaderboard subscribes and triggers a refetch instantly; Broadcast is pure WebSocket pub/sub with no WAL or RLS involved

---

## [1.4.4] — 2026-07-06

### Home → Dynamic headline system (100 contexts)

- Home headline now rotates across 100 different contexts based on athlete data
- Priority: PR today → close to tier-up → PRs this month → Elite → volume → body ratio → advanced spread → tier/standing → philosophical
- Deterministic daily rotation (changes every day, never random) — user never sees the same headline two days in a row
- No new Supabase query — uses exclusively data already loaded

---

## [1.4.3] — 2026-07-06

### Training → Gymnastics: delete set

- UnbrokenDetail: delete button on each history row (tap → confirm DEL / cancel)
- `useUnbrokenSets`: new `deleteSet(setId)` method

---

## [1.4.2] — 2026-07-05

### UI → English strings sweep

- Translated all remaining Portuguese-language strings to English across 22 files
- BMI labels (Abaixo do peso / Peso normal / Sobrepeso / Obesidade → Underweight / Normal / Overweight / Obese)
- Drawer navigation labels, BottomNav, ProfilePanel fields, WorkoutImportSheet UI, Toast buttons, BuildupSheet, AddScore, Buildup, CompetitionDetail, JudgePanel, Leaderboard, Onboarding, PersonalAthlete, Stats, Validation error messages in competitionScore.ts

---

## [1.4.1] — 2026-07-05

### UI → Safe Area (iPhone notch / Dynamic Island)

- Fixed notch overlapping headers on all app pages (InviteInbox, CompetitionManage, CompetitionDetail, CompetitionCreate, CompetitionEdit, CompetitionList, JudgePanel, Leaderboard, TeamManage, TeamCreate, Timer, AthleteReport)
- Sticky headers (Home, Profile, MyWorkouts) now also protect content while scrolling
- WrappedReport: progress bars and brand label repositioned with `calc(env(safe-area-inset-top) + offset)`

---

## [1.4.0] — 2026-07-05

### Training → Benchmark WODs (Girls & Heroes)

- Training → Add PR: Girls and Heroes now have a time form (MM:SS) instead of load
- Training → Add PR: RX / SCALED toggle — RX records only time; SCALED exposes a weight field + adaptation text (max 200 chars)
- Training → Add PR: displays current PR below time inputs; lime "NEW PR" badge when typed time is better
- Training → MovementDetail: time mode for movements with `score_type = 'time'` — WOD description card (exercises, RX loads, Elite/Advanced/Avg benchmarks), PR in MM:SS in lime, history with RX/SCALED badge, weight and adaptation when SCALED
- Training → MovementDetail: new time PR celebration panel
- Home: "Benchmark WODs" section shows Girls/Heroes with recorded time PRs; "Main PRs" section excludes time movements
- DB: `score_type` column on `movements` (weight/time/rounds, default weight); Girls and Heroes set to 'time'
- DB: `weight_kg` on `scores` now nullable (support for RX without load)
- DB: columns `time_seconds`, `rx` (default true), `adaptation` (text max 200) on `scores`
- `src/lib/benchmarkWods.ts`: descriptions and benchmarks for 19 WODs (Fran, Grace, Annie, Cindy, Karen, Isabel, Helen, Eva, Kelly, Amanda, Murph, DT, Michael, JT, Diane, Randy, Ryan, Josh, Nate)

---

## [1.3.0] — 2026-07-04

### Training → Unbroken Tracker

- Training → Unbroken Tracker: new feature to record unbroken sets of gymnastics movements (reps + time)
- Training → Unbroken Tracker: listing with PR reps highlighted (32px lime), time, reps/sec and date per movement
- Training → Unbroken Tracker: movement detail with 3-column PR block (PR REPS · TIME · REPS/SEC), SVG chart with REPS/REPS/SEC toggle and full set history with lime border on PR
- Training → Unbroken Tracker: record bottom sheet with large reps input (52px) + separate MIN:SEC fields (competition ScoreInput pattern) + live reps/sec preview + NEW PR badge
- Training → Add PR: horizontal tab bar with 5 categories — WEIGHTLIFTING | GYMNASTICS | MONOEST. | GIRLS | HEROES
- Training → Add PR: selecting a category shows a filtered exercise list with a search bar; selected exercise appears as lime title instead of dropdown
- Training → Add PR: GYMNASTICS navigates to the Unbroken Tracker instead of the load form
- DB: `category` column added to `movements` (default: weightlifting, backward-compatible)
- DB: new `unbroken_sets` table (reps, time_seconds) with RLS validating `movement_id` ownership

---

## [1.2.0] — 2026-07-01

### Competition → Live Leaderboard

- Competition → Leaderboard: rank movement arrows beside team name — lime up / red down, visible for 30s with fade-out on the last 8s
- Competition → Leaderboard: movement baseline persists in sessionStorage (10 min), so arrows appear even when navigating to the leaderboard after submitting a score
- Competition → Leaderboard: rows slide smoothly to their new position on reorder (FLIP animation)
- Competition → Leaderboard: WOD cells show raw result (time/reps/kg) as primary value with podium-colored points tag beside it
- Competition → Leaderboard: TB (tiebreak) tag moved from rank column to beside team name — rank column no longer stretches
- Competition → Leaderboard: crown redesigned as stroke outline icon
- Competition → Leaderboard: auto-refresh interval 60s → 30s
- Competition → Leaderboard: RPC errors shown in the UI instead of a generic empty state

### Platform → Layout (z-index stacking fix)

- Platform → Layout: full-screen pages (JudgePanel, Leaderboard, CompetitionManage, CompetitionDetail) raised above BottomNav — judge CONFIRM bar and leaderboard ticker no longer hidden on mobile
- Platform → Layout: fixed bottom CTAs in CompetitionCreate and PersonalWorkout gained explicit z-index
- Platform → Layout: standardized scale — content < BottomNav (30) < full-screen pages/CTAs (50) < modals (90) < timer (100) < toast (300)

### Tools → Timer

- Tools → Timer: done screen shows centered BACK + NEW TIMER buttons side by side

---

## [1.1.0] — 2026-07-01

### Tools → CrossFit Timer

- Tools → Timer: 6 modes — For Time, AMRAP, EMOM, Tabata, Interval, Stopwatch
- Tools → Timer: fullscreen display with 3-2-1 countdown, phase colors, last-10s pulse animation
- Tools → Timer: Web Audio beeps for countdown, phase transitions, and finish
- Tools → Timer: Wake Lock API keeps screen on during active timer
- Tools → Timer: vibration feedback on finish
- Tools → Timer: AMRAP round counter with tap-to-count + ROUND button
- Tools → Timer: editable time fields with +15s/+30s/+1m/+5m quick increments
- Tools → Timer: accessible from Profile → Calculators section

---

## [1.0.0] — 2026-07-01

### Competition → Judge Panel & Leaderboard polish

- Competition → JudgePanel: structured score inputs (MIN/SEC/REPS/KG/ROUNDS) matching the Results tab format
- Competition → JudgePanel: confirm button always visible via `position: fixed` bottom — no longer hidden behind keyboard or tall content
- Competition → JudgePanel: division filter pills with horizontal scroll, matching leaderboard
- Competition → JudgePanel: teams sorted alphabetically; division label shown instead of box name for both pending and submitted teams
- Competition → JudgePanel: live cap validation error shown inline (e.g. time exceeds 08:00 cap)
- Competition → JudgePanel: score inputs allow clearing to zero (empty field instead of stuck at 0)
- Competition → Leaderboard: WOD cells show points as primary value; top-3 positions highlighted with gold/silver/bronze badge
- Competition → Leaderboard: BOX column removed
- Competition → Leaderboard: teams without a result show `—` instead of DNS
- Competition → Leaderboard: live scoreboard — submitted results appear immediately without requiring publish

### Platform → Layout & Scroll fixes

- Platform → Layout: `TabLayout` bounded to `h-dvh overflow-hidden` on all breakpoints — eliminates document-level scroll on mobile
- Platform → Layout: full-screen pages (`JudgePanel`, `Leaderboard`, `CompetitionManage`, `CompetitionDetail`) use `position: fixed; inset: 0` to escape the layout wrapper and manage their own scroll
- Platform → Layout: resolves all cases where last list item was cut off or confirm button was unreachable on mobile

---

## [0.9.9] — 2026-07-01

### Competition → Scoring

- Competition → Leaderboard: leaderboard now works as a live scoreboard — results appear as soon as submitted, without requiring head judge to publish each result
- Competition → Scoring: dynamic N-position scoring per division — 1st place earns N pts (N = approved teams in the division), last earns 1 pt
- Competition → Results: results table in CompetitionManage shows per-division rank and points
- Competition → Results: `get_competition_results` SECURITY DEFINER RPC bypasses RLS for judge/admin fetches

### Competition → Divisions

- Competition → Divisions: new `competition_divisions` table (format × composition × category) with RLS — organizer can create/delete, everyone can read
- Competition → Divisions: `competition_teams` gains `division_id` FK — teams register into a specific division
- Competition → Create: organizer can add divisions (format/composition/category toggles + custom category field) during competition creation
- Competition → Register: `TeamCreate` shows division picker cards when competition has divisions
- Competition → Mixed: `respond_team_invite` validates Mixed division gender composition on accept — only `male`/`female` allowed, generic error to prevent gender inference
- Competition → Leaderboard: division filter pills added (visible when 2+ divisions); ranking is relative to the selected division via updated `get_competition_leaderboard(p_competition_id, p_division_id?)`
- Competition → TeamManage: division badge displayed in team hero section
- Profile → Gender: Male/Female toggle added to ProfilePanel edit mode, saved to `profiles.gender`

---

## [0.9.8] — 2026-06-30

### Platform → Full English localization

- Platform → i18n: All user-visible strings translated from Portuguese to English across the entire app — no i18n library, direct string replacement
- Platform → i18n: UI pages translated: Admin, Personal, PersonalAthlete, PersonalWorkout, MyWorkouts, MovementDetail, Stats, Profile, Onboarding, Buildup, Invite, InviteInbox, JudgePanel, CompetitionDetail, CompetitionManage, CompetitionCreate, CompetitionPublic, TeamManage, TeamCreate, Leaderboard
- Platform → i18n: Components translated: WorkoutCard, MovementPicker, BuildupSheet, WorkoutImportSheet, ProfilePanel, SideNav
- Platform → i18n: Lib modules translated: workoutDisplay (SETS/REST/INTERVAL/day names), strengthLevel (level/category/confidence labels, guidance strings), strengthStandards (tier labels), movementSuggestions (all muscle/mobility/variation/programming content), prReport (PR poster HTML), storiesReport (stories HTML), buildupUtils (warning messages)
- Platform → i18n: Auth: useAuth error messages translated (invalid credentials, user creation failure)
- Platform → i18n: WrappedReport and AthleteReport fully translated (322 + 17 strings)
- Platform → Routing: All athlete routes moved under `/athlete/` prefix (done in prior session)

---

## [0.9.7] — 2026-06-29

### Competition → Public leaderboard link

- Competition → Leaderboard: public route `/competition/:slug` added — no auth required, anyone with the link can access the live leaderboard
- Competition → Leaderboard: slug generated server-side in `create_competition` RPC via `gen_random_bytes` (6 hex chars, uniqueness guaranteed with retry loop)
- Competition → Leaderboard: existing competitions received an automatic slug via backfill in the migration
- Competition → Share: links updated from `/c/` to `/competition/` in `CompetitionDetail` and `TeamManage`

---

## [0.9.5] — 2026-06-29

### Infra → Custom domain

- Infra → Domain: app migrated from `cf-scores.vercel.app` to `gounbroken.app`
- Infra → Public links: team invite URLs and competition slugs updated from `cfscores.app` to `gounbroken.app`
- Infra → Supabase: Site URL and Redirect URLs updated to `https://gounbroken.app`

### SEO → Basic indexing

- SEO → `index.html`: descriptive `<title>`, `<meta description>`, Open Graph and Twitter Card tags
- SEO → `robots.txt`: created with `Allow: *` and sitemap reference
- SEO → `sitemap.xml`: created with public pages (root and /competitions)

---

## [0.9.4] — 2026-06-29

### Competition → Leaderboard and results

- Competition → CompetitionDetail: "VIEW LEADERBOARD" button now only appears when the competition is `in_progress`
- Competition → CompetitionDetail: "FINAL RESULTS" section shown inline when competition is `finished` — table with rank, medals (gold/silver/bronze), position per WOD and total points; `#` and `TEAM` columns sticky on horizontal scroll
- Competition → CompetitionDetail: WODs in `submitted` or `draft` are hidden (greyed out) — show "WOD N" instead of the real name, without score type, cap or click — information protected until publication
- Competition → Leaderboard: mobile fully supported — horizontal scroll with sticky columns, BOX column hidden on small screens, native touch-scroll

### Competition → Inline WOD editing

- Competition → CompetitionManage: WODs now editable directly in the panel — name, description, score type, cap and status; available in any WOD state
- Competition → CompetitionManage: "END COMPETITION" action now requires inline confirmation before executing
- Competition → CompetitionManage: WOD "UNPUBLISH" action now requires inline confirmation before executing
- DB → RPC `update_competition_wod(wod_id, name, description, score_type, score_order, cap)`: new SECURITY DEFINER function restricted to head_judge and admin, validates score_type/score_order, writes audit log

### UX → Confirmations on destructive actions

- PersonalAthlete → Workouts: deleting a workout now requires confirmation in a bottom sheet before executing
- TeamManage → Team: cancelling an invite now requires inline confirmation (YES/NO) before executing

### Bugfix → JudgePanel

- Competition → JudgePanel: time scores now stored as positive seconds (was negative, causing inverted ranking in leaderboard for `for time` WODs)

### Security

- DB → RLS: `UPDATE` policy on `profiles` gained `WITH CHECK (auth.uid() = user_id)` clause — prevented a user from changing their own `user_id` to another (profile hijacking)
- DB → RLS: duplicate policy on `weight_history` without `WITH CHECK` removed
- DB → RLS: `prescribed_workouts` policy gained `WITH CHECK (trainer_id = auth.uid())` — prevented fake `trainer_id` injection
- DB → 10 `SECURITY DEFINER` functions without `SET search_path = public` fixed via `ALTER FUNCTION` (without recreating): `admin_delete_workout`, `admin_toggle_user_active`, `admin_toggle_user_role`, `admin_update_user_role`, `ai_save_workout`, `get_athlete_recent_feedback`, `get_email_by_username`, `get_my_prescribed_workouts`, `get_my_prs`, `save_workout_feedback`

### QA

- QA → `qa_test@gounbroken.test`: 71 PRs inserted across 22 movements (Back Squat, Deadlift, Snatch, Clean & Jerk, etc.) with realistic temporal progression Oct/2025–Jun/2026
- QA → `qa_test`: weight history (6 months), complete profile (`intermediate`, 4x/week, performance, crossfit+weightlifting)

---

### Compliance → Terms acceptance

- Compliance → Terms: terms of use and privacy policy acceptance screen added (`/terms`) with mandatory scroll to the bottom before the checkbox and button unlock
- Compliance → Terms: gate inserted in `RequireAuth` (terms before onboarding) — users who haven't accepted the current version are redirected to `/terms`
- Compliance → Terms: `terms_accepted_at` and `terms_version` columns added to `profiles` with CHECK constraint restricted to valid versions
- Compliance → Terms: internationalized text (no Brazil/CPF references) — covers GDPR, LGPD, CCPA and similar legislation

### PRs & Insights → Strength Level

- PRs & Insights → Strength Level: fixed critical bug where movements with names without qualifiers (e.g. "Shoulder Press") were not counted in the correct category due to using exact-match instead of normalization — now uses `normalizeMovement` + `MOVEMENT_MAP` + `BASE_TO_CATEGORY`
- PRs & Insights → Strength Level: Thruster reclassified from "Accessory Strength" to "Shoulder Strength" (correct CrossFit taxonomy)
- PRs & Insights → Strength Level: Overhead Squat reclassified from "Squat Strength" to "Olympic Lifting"
- QA → Unit tests: 3 regression tests added covering name normalization bugs
- QA → Infra: `normalizeMovement` and `MOVEMENT_MAP` exported from `strengthStandards.ts` for external reuse

### Competition → Results per WOD

- Competition → WOD detail: clicking a `published` WOD opens a bottom sheet with team rankings (position, name, box, result)
- Competition → WOD detail: top 3 highlighted in lime, 1st place with lime background and name in #D4FF3A
- Competition → WOD detail: if no published results yet, shows "NO PUBLISHED RESULTS"
- Competition → Unpublished WODs (`draft`, `submitted`) show contextual label and are not clickable
- DB → RPC `get_wod_ranking(wod_id)`: returns ranking for a WOD with team names (SECURITY DEFINER, bypasses RLS)

### Competition → Live leaderboard

- Competition → Leaderboard: page implemented (was "COMING SOON" stub) with brutalist team table, WOD strip, LIVE badge and 60s countdown
- Competition → Scoring: replaced CF Games fixed scale (array 100-95-92…) with dynamic N-down-to-1 — 1st place gets N pts, last gets 1 pt, where N = total approved teams
- Competition → Seed: "GO UNBROKEN Open 2025" competition created with 15 approved teams, 5 published WODs and 75 results for testing (Team Alpha 1st with 70 pts)

---

## [0.9.3] — 2026-06-28

### PRs & Insights → New PR celebration

- PRs → AddScore: when a PR is broken, app navigates directly to MovementDetail with a celebration bottom sheet — no toast, no extra step
- PRs → Celebration: new record number in 52px lime, movement name, RM badge; "Share" (opens share sheet) and "Close" buttons
- PRs → Share Stories: elements scaled to real Instagram Stories format — hero number 260px (was 168px), movement 104px, KG 68px, chart 340px height

### UX → Toasts removed

- App: removed all toast notifications (success/error/info) from the entire application — no more visual feedback pop-ups

---

## [0.9.2] — 2026-06-28

### PRs & Insights → Share individual PR (Stories)

- PRs → MovementDetail: "Share" button next to Build-up — generates 1080×1920 PNG and opens native share sheet via Web Share API; on desktop downloads the PNG
- PRs → Stories: 168px lime giant number, 68px movement name, RM badge, progress chart, other RM ladder, tier badge

---

## [0.9.1] — 2026-06-28

### PRs & Insights → PR poster (redesign)

- PRs → PDF: replaced jsPDF with hi-fi 1080×1488px poster via `window.print()` — selectable text, correct fonts (Space Grotesk + JetBrains Mono), zero new dependencies
- PRs → PDF: hero card with lime background for the highest score record (Back Squat, Deadlift etc.); 118px giant number, tier/percentile badge when strength standard is available
- PRs → PDF: historical progression chart (SVG polyline) in hero card, shown when ≥ 2 1RM records exist
- PRs → PDF: RM rule — when a movement has only one RM type available, shows the badge inline; when multiple, the lowest (1RM > 2RM > …) is the main highlight and the rest appear in the ladder (hero) or "Also" line (list)
- PRs → PDF: rep-max badge — 1RM in outline (#A8A8A4), primary ≠ 1RM in filled (#1F1F1F)
- PRs → PDF: "Other Records" list with up to 5 additional movements, index color reflects the tier
- PRs → PDF: strength scale with 6 tier segments and "you → <tier>" annotation
- PRs → PDF: registration corners, dashed vertical ruler, "REP · BY · REP" footer

---

## [0.9.0] — 2026-06-26

### PRs & Insights → Export PDF

- PRs → Profile: new "Export PRs" button in the Calculators section, next to Build-up — same visual pattern (lime bar + title + subtitle)
- PRs → PDF: generated client-side via jsPDF (dynamic import — separate chunk, does not impact initial PWA bundle)
- PRs → PDF: #0A0A0A background, header with "PR REPORT" in lime, athlete name and generation date
- PRs → PDF: lists all movements with a PR in alphabetical order; if a movement has multiple RMs (1RM, 3RM, 5RM…), all appear on separate lines
- PRs → PDF: automatic pagination for large movement volumes

### Competition → CompetitionManage: tab persisted in URL

- Competition → CompetitionManage: active tab now persisted via query param `?tab=JUDGES` (and other tabs) — page refresh keeps the correct tab instead of returning to "OVERVIEW"

---

## [0.8.9] — 2026-06-15

### Competition → Judge experience after accepting

- Competition → JudgePanel: selected WOD now shows full WOD description below the name and score type — judge can read the WOD before recording results
- Competition → InviteInbox: accepted judge invite cards in history show "GO TO PANEL" button that navigates directly to `/competitions/:id/judge`

---

## [0.8.8] — 2026-06-15

### Competition → Invite Inbox

- Competition → Profile: new "Invite Inbox" access in the user profile — navigates to `/invites`
- Competition → InviteInbox: centralized page with all received invites (judge + team), sorted by date
- Competition → InviteInbox: `PENDING` section with ACCEPT / DECLINE inline cards for each invite
- Competition → InviteInbox: `HISTORY` section with previously accepted/declined invites and final status pill
- Competition → InviteInbox: hero with "X NOTIFICATIONS · Y PENDING" counter and highlighted text when there are pending invites
- Competition → DB: new `get_my_invites()` RPC (SECURITY DEFINER) — returns UNION of judge invites + team invites for the logged-in user with join on competitions/competition_teams, sorted by `created_at DESC`

### Competition → RLS and count bugfixes

- Competition → useCompetition: captain path now uses `get_team_members` RPC (SECURITY DEFINER) instead of direct query — fixes 0/4 in the "MY TEAM" section
- Competition → useCompetition: member path also uses `get_my_team_in_competition` RPC to fetch the team — bypasses circular RLS between `competition_teams` ↔ `competition_team_members`
- Competition → get_team_members / get_competition_team_members: excludes members with `status = 'removed'` and `'rejected'` — fixes inflated count (e.g. 10/4 due to cancelled invite history)
- Competition → CompetitionManage: team members now loaded via `get_competition_team_members` RPC — head judge can see athletes from teams they are not captain/member of
- Competition → DB: new `get_competition_team_members(p_competition_id)` RPC (SECURITY DEFINER) — returns all active members of all teams in a competition

### Competition → Team approval

- Competition → manage_team: approval blocked if any member still has an invite with `status = 'invited'` — DB returns descriptive error with pending count
- Competition → CompetitionManage: APPROVE button visually disabled when there are pending invites; "X PENDING INVITE(S)" warning appears in the actions column
- Competition → CompetitionManage: team rows in the TEAMS tab are clickable — expand a sub-row with the athlete list (name, @username, status, CAPTAIN indicator)

### Competition → MY TEAM for accepted members

- Competition → useCompetition: athletes who accepted a team invite now see the "MY TEAM" section in CompetitionDetail — previously only showed for the captain
- Competition → DB: new `get_my_team_in_competition(p_competition_id)` RPC (SECURITY DEFINER) — returns the logged-in user's team data without depending on circular RLS
- Competition → DB: new `get_my_team_invite(p_competition_id)` RPC (SECURITY DEFINER) — detects pending user invite without depending on `teamsData` (fix for athletes without an approved team)

---

## [0.8.7] — 2026-06-14

### Competition → Accept team invite

- Competition → CompetitionDetail: "INVITE · TEAM" banner appears for the invited athlete right after the competition hero — shows team name with ACCEPT / DECLINE buttons
- Competition → useCompetition: detects `pendingTeamInvite` (invite with status='invited' for the logged-in user in this competition) and returns it alongside other hook data
- Accepting calls `respond_team_invite(p_member_id, p_accept: true)` → banner disappears, "MY TEAM" section appears automatically
- Declining calls `respond_team_invite(p_member_id, p_accept: false)` → banner disappears, athlete can create their own team if registrations are still open

---

## [0.8.6] — 2026-06-14

### Bugfix — Invited athlete names not showing

- Competition → TeamManage: invited athlete names now appear correctly after refresh — the `.from('profiles')` query was blocked by the table RLS; replaced with `get_profiles_public` (existing SECURITY DEFINER RPC, which bypasses RLS)
- Competition → TeamManage: `onInvited` flow simplified — removed complex optimistic update with race condition; now calls `load()` directly after invite (DB round-trip ~200ms)
- Competition → TeamManage: removed `silentReloadMembers` which could overwrite state with partial data; `handleCancelInvite` also uses `load()` now
- DB → `fix_invite_flow_final.sql`: `get_team_members` updated to never return ghost members (user_id=NULL without email); aggressive DELETE removes all ghosts regardless of status

---

## [0.8.5] — 2026-06-14

### Bugfix — Invite and cancel flow

- Competition → TeamManage: invitee appears immediately in the list after invite (optimistic update) without needing to reload the page; background silent reload confirms DB state
- Competition → TeamManage: X button appears on "INVITED" slots for captain to cancel pending invites — calls `cancel_team_invite` and removes member from list locally
- Competition → InviteSheet: self-invite fixed — `search_athletes_for_invite` now excludes the current user from search results
- DB → Migration `cancel_team_invite.sql`: new `cancel_team_invite(p_member_id UUID)` RPC — only captain can cancel, only works on invites with `status='invited'`, marks as `'removed'` (history preserved)

---

## [0.8.4] — 2026-06-12

### Bugfix — Athlete invites

- Competition → TeamManage: fixed RPC for accepting/declining invite — was `accept_team_invite`/`decline_team_invite` (non-existent), now correctly calls `respond_team_invite(p_member_id, p_accept)`
- Competition → TeamManage: athlete search now passes `team_id` to exclude members already on the team
- DB → `fix_search_athletes_for_invite.sql`: `search_athletes_for_invite` updated — excludes the captain from results and excludes athletes already on the team (only if caller is captain of that team, preventing enumeration)

---

## [0.8.3] — 2026-06-12

### Bugfix — Team registration

- Competition → TeamCreate: removed redundant "captain" mention from info box; button renamed from "CREATE AND INVITE ATHLETES" to "CREATE TEAM"
- Competition → TeamManage: captain now always appears filled in slot 1 after creation — if the record doesn't come from the query (old version of DB function), it is synthesized from `team.captain_user_id`
- Competition → TeamManage: profile fetch now includes the captain even if they are not in `members`
- DB → Migration `fix_create_competition_team_captain.sql`: recreates `create_competition_team` ensuring the captain is inserted as a member in `competition_team_members`

---

## [0.8.2] — 2026-06-12

### Competitions

- Competition → Manage: `cancelled` status added — head judge can cancel a competition from any active state with inline confirmation
- Competition → Manage: status transitions simplified — only `draft → open` and `in_progress → finished` are manual; `open → closed` and `closed → in_progress` are automatic by date
- Competition → Manage: informational chips show "REGISTRATIONS CLOSE IN" (open state) and "EVENT STARTS IN" (closed state) instead of buttons when the transition is automatic
- Competition → Manage: creative labels on status pills (DRAFT, OPEN, CLOSED, LIVE, FINISHED, CANCELLED)
- DB → Constraint: `competitions.status` now accepts `'cancelled'`
- DB → RPC `update_competition_status`: updated to accept `'cancelled'`
- DB → Function `auto_transition_competition_statuses()`: new SECURITY DEFINER (service_role only) that does `open→closed` when `registration_deadline < now()` and `closed→in_progress` when `start_date <= CURRENT_DATE`
- Infra → Edge Function `auto-transition-competitions`: new Deno function that calls `auto_transition_competition_statuses()` via service_role — schedule with cron `0 * * * *` in the dashboard

### Tests

- QA → E2E Playwright: test infrastructure for the competition module (`tests/helpers/seed.ts`, `tests/helpers/auth.ts`, `tests/competition.spec.ts`)
- QA → E2E: seed/cleanup with service_role (bypasses RLS) + 6 scenarios: list, management panel, publish registrations, create WOD, verify status, cancel with confirmation
- QA → Playwright config: loads `.env.test.local` automatically (template in `.env.test.local.example`)

---

## [0.8.1] — 2026-06-06

### Competitions

- Competition → Judge Panel: full rebuild — WOD chips at the top, clicking a WOD shows team list directly (no tabs), pending teams with RECORD button, submitted teams with SUBMITTED pill and displayed score
- Competition → Judge Panel: score form with large input (56px lime), validation by type (MM:SS for time, integer for reps, decimal for weight, rounds+reps), observations field and CONFIRM button
- Competition → Manage: CANCEL button for an approved team now requires inline confirmation ("CONFIRM CANCELLATION? / YES, CANCEL / BACK") before executing
- Competition → Manage: PUBLISH WOD button now calls `update_wod_status` (changes WOD status to published) instead of `publish_wod_results`
- DB → RPC `update_wod_status(wod_id, status)`: new SECURITY DEFINER function that changes the status of an individual WOD (draft/submitted/published), restricted to head_judge and admin, writes audit log

---

## [0.8.0] — 2026-05-20

### Competitions (new module)

- Competition → List: public competition list page with status, dates and leaderboard link
- Competition → Detail: public page with information, published WODs and registration CTA
- Competition → Create: admin-restricted form to create a new competition
- Competition → Manage: tabbed panel (Overview, WODs, Teams, Results) for head judge and admin
- Competition → Teams: team creation via `create_competition_team` RPC, member invites by email, accept/decline invites
- Competition → Judge Panel: WOD selection + results recording per team (RPC `submit_competition_result`)
- Competition → Leaderboard: cumulative ranking by points (position per WOD), automatic 60-second polling
- DB → 8 tables with RLS: `competitions`, `competition_wods`, `competition_teams`, `competition_team_members`, `competition_roles`, `competition_judge_invites`, `competition_results`, `competition_result_audit_log`
- DB → 12 `SECURITY DEFINER` RPCs: team creation, invites, approvals, payments, result submission/publication, leaderboard
- DB → Score types: time (MM:SS), reps, weight, rounds+reps — ASC ranking for time, DESC for the rest
- DB → Automatic audit log on overrides and result publications
- Nav → Competitions added to SideNav (desktop) and BottomNav (mobile, replacing Stats)

---

## [0.7.5] — 2026-05-20

### Security

- Auth → Login: brute force protection — max 10 attempts per username and 20 per IP in a 15-min window (`login_attempts` table)
- AI → `suggest-workout`: defense against prompt injection in `coach_notes` — PT/EN pattern blocklist + leetspeak normalization + 500-char cap
- AI → `suggest-workout` and `generate-workout`: internal errors (500) no longer expose stack traces or infrastructure details to the client
- AI → `generate-workout`: `days` array validation — maximum 7 unique dates in YYYY-MM-DD format
- DB → `save_workout_feedback`: defense against prompt injection in `student_comment` + 300-char cap via `is_safe_text` helper
- DB → 4 `SECURITY DEFINER` functions without `SET search_path`: fixed (`admin_get_ai_usage_stats`, `admin_get_ai_usage_recent`, `admin_get_ai_usage_by_user`, `personal_set_workout_student_note`)
- DB → `ai_usage_log.sql`: migration fixed to not recreate the open INSERT policy on re-runs
- Analytics → PostHog: email removed from `phIdentify` (LGPD compliance)

---

## [0.7.4] — 2026-05-20

### Security

- Infra → `ai_usage_log`: open INSERT policy (`WITH CHECK(true)`) removed — only service_role (Edge Functions) can insert
- Personal → `get_athlete_recent_feedback`: authorization guard added — only the athlete themselves, their trainer or admin/personal can query
- Personal → `save_workout_feedback`: ownership validation added — verifies the workout belongs to the athlete before saving (prevents IDOR)
- AI → Edge Functions `suggest-workout` and `generate-workout`: mandatory role check (personal/admin/ai only) + server-side rate limiting (20/day and 3/week)
- Router → routes `/admin`, `/personal*`, `/report*`, `/wrapped*`: protected by `RequireRole` on the frontend, redirects to `/` if without permission

---

## [0.7.3] — 2026-05-20

### Security

- Auth → Login by username: user email now resolved server-side via `login-by-username` Edge Function — never exposed to the client
- Auth → Signup: username availability check replaced by `is_username_taken` (returns boolean) — `get_email_by_username` revoked from anon and authenticated roles

---

## [0.7.2] — 2026-05-19

### Added

- Training → BuildUp: "Plates to grab" block shown above sets — displays the total unique plates needed throughout the entire build-up (peak maximum per type, both sides), without double-counting plates that persist between sets
- Training → BuildUp: same logic applied to BuildupSheet (movement sheet)

### Changed

- PRs & Insights → Restricted access: "Report" button in Training, "View monthly report" and "View Wrapped" buttons in Personal/Athlete, and "WRAPPED" button in the report now only visible to users with `ai` role

---

## [0.7.1] — 2026-05-18

### Added

- Training → Monthly Report: new `/report` page for the student to view their monthly report
- Personal → Athlete Report: coach can access any athlete's monthly report via `/report/:athleteId`
- Report includes: magazine cover, consistency (done/partial/not done), body map by intensity (front+back), focus distribution, monthly calendar, PRs and effort perception breakdown
- MyWorkouts: "Report" button at the top links to the student's monthly report
- PersonalAthlete: "View monthly report" button on the athlete profile

---

## [0.7.0] — 2026-05-15

### Improved

- Personal → Suggest workout: modal completely redesigned with segmented mode selector (Full workout / Single step)
- Personal → Suggest workout: "Single step" now functional — generates a single section (Strength, WOD, Mobility etc.) and adds to the workout without replacing existing steps
- Personal → Suggest workout: 30-minute duration added alongside 45 and 60
- Personal → Suggest workout: intensity now shows a short description (RPE + context) instead of just the name
- Personal → Suggest workout: optional "Coach notes" field to pass context when generating the suggestion
- Personal → Suggest workout: CTA button renamed from "Generate suggestion" to "Create suggestion" / "Create step"
- Personal → Preview: sections in separate cards with distinct visual, same pattern as WorkoutCard
- Student → Workouts: feedback layout redesigned — "I did the workout" full-width highlight, secondary actions in a row
- Student → Workouts: comment placeholder updated per product spec
- Student / Coach → Feedback: coach view now shows status, liked, perceived intensity and comment with differentiated visual chips
- WorkoutCard → Visual hierarchy: expanded sections use separate blocks with bg and border instead of divide-y
- Backend → suggest-workout: support for `mode` ("full" | "section"), optional `section_type` and `coach_notes`
- Backend → suggest-workout: single step prompt reduced (2048 tokens max) — faster and cheaper
- Backend → suggest-workout: equipment constraints expanded with CrossFit references (kg, inches, ergs)
- UI → WorkoutImportSheet: removed "AI" mention from the interface — replaced with functional description

---

## [0.6.13] — 2026-05-15

### Added

- Admin → "Claude" tab: AI usage panel — loaded on demand when clicking the tab
- Admin → Claude: cost cards (current month, all-time, week, average per call)
- Admin → Claude: breakdown by function — Suggest workout vs Generate plan (cost + calls + average)
- Admin → Claude: top users by all-time cost
- Admin → Claude: log of last 50 calls with date, function, coach, athlete, tokens in/out and cost
- Backend → Edge Functions: `suggest-workout` and `generate-workout` record tokens and cost in `ai_usage_log` after each call (fire-and-forget via service role)
- Backend → SQL: `ai_usage_log` table with RLS (only admin reads); RPCs `admin_get_ai_usage_stats`, `admin_get_ai_usage_recent`, `admin_get_ai_usage_by_user`
- App → Login: version updated to `0.6.13` via `package.json`

---

## [0.6.12] — 2026-05-15

### Added

- Student → Workouts: completion feedback per workout — athlete can mark "Done", "Partially done" or "Not done" on past and today's workouts
- Student → Workouts: quick feedback sheet after marking completion — liked (Liked/Neutral/Didn't like), intensity (Light/Just right/Too heavy) and optional comment
- Student → Workouts: completion status visible on the card (chip in header) without needing to expand
- Student → Workouts: shows coach "Note" at the top of the expanded workout (subtle lime background), visible only when filled in
- Personal Trainer → Prescription: "Note for athlete" field in the workout creation form — auto-filled by the workout suggestion, editable by coach before saving
- Personal Trainer → Prescription → Preview: shows the note before the workout steps
- Personal Trainer → Athlete profile: workout history shows athlete feedback (status + liked + intensity + comment) in read mode
- Backend → Edge Function `suggest-workout`: considers feedback history from the last 14 days when generating suggestion (skipped workouts → less volume; too heavy → reduce load; athlete comments → adjust focus)
- Backend → Edge Function `suggest-workout`: returns `student_note` — a short human sentence explaining adjustments made based on history
- Backend → SQL: `workout_feedback` table with RLS (athlete writes own, coach reads linked athletes); `student_note` field on `prescribed_workouts`; RPCs `save_workout_feedback`, `get_athlete_recent_feedback`, `personal_set_workout_student_note`

---

## [0.6.11] — 2026-05-15

### Improved

- Personal Trainer → Prescription → Preview: visual hierarchy of steps — step type in lime small caps, label in white/55 normal case; format line in white/35 subtle; exercise name without uppercase; load/reps details in white/60 12px; rest and notes in italic white/35 11px
- Personal Trainer → Prescription: workout draft persisted in sessionStorage — F5 on the creation screen restores steps, focus, tags, notes and date; draft cleared automatically on save

---

## [0.6.10] — 2026-05-15

### Added

- Personal Trainer → Prescription: "Suggest workout" button on the workout creation screen — generates a structured session without saving, populating the builder for the coach to review and edit before sending
- Personal Trainer → Prescription: suggestion sheet with focus selection (Full Body, Upper/Lower, Strength, CrossFit, Cardio, Skill, Mobility), duration (45/60/75/90 min) and intensity (Light/Moderate/Intense)
- Personal Trainer → Prescription: reuses the focus already selected on the screen if only one focus is active
- Personal Trainer → Prescription: if there are already steps in the builder, asks whether to replace everything, add below or cancel
- Backend → Edge Function `suggest-workout`: calls Claude Haiku with the athlete's PRs, returns structured JSON by steps without saving to the DB

---

## [0.6.9] — 2026-05-15

### Added

- Personal Trainer → Prescription: "Reps / Scheme" field accepts free text — supports schemes like "21-15-9" or "30-20-10" per exercise; in the preview shows the scheme directly without "REPS"
- Personal Trainer → Prescription: drag and drop exercises within the same step — ⠿ handle on each exercise, reordering with lime indicator, exercises don't cross between steps

---

## [0.6.8] — 2026-05-15

### Improved

- Personal Trainer → Prescription: step order fixed to CrossFit sequence — Mobility, Warm-Up, Strength, Skill, Conditioning, WOD, Accessories, Cool Down
- Personal Trainer → Prescription: "Add exercise" sheet reordered — search results appear above the search field, which is now fixed at the bottom of the sheet (close to the keyboard)
- Personal Trainer → Prescription: steps with drag and drop — ⠿ icon in the header; dragging reorders with lime border at the target

### Removed

- Training → Builder: WorkoutBuilder component removed from the application — manual mode returns to just textarea + preview (same as before)

---

## [0.6.7] — 2026-05-12

### Added

- App → Desktop: fixed sidebar navigation (220px) with Go/Unbroken wordmark, navigation links with lime indicator, "Register PR" button and user avatar
- App → Desktop: responsive layout — mobile keeps bottom nav, desktop uses lateral sidebar + fluid content without 430px restriction
- App → Desktop: WorkoutImportSheet becomes a centered modal (600px) on desktop instead of a bottom sheet

### Improved

- Navigation → Desktop: sidebar shows "Personal" link for users with admin/personal role
- Navigation → Mobile: BottomNav stays the same, now hidden on desktop (`md:hidden`)
- Workouts, PRs, Profile: sticky responsive headers with `md:max-w-5xl md:mx-auto`; content with wider side padding on desktop
- Pages: `pb-24`/`pb-28` becomes `md:pb-8` on desktop (no bottom nav to compensate)
- AddScore, MovementDetail, Buildup, Admin, Personal: now included in TabLayout to have sidebar on desktop

---

## [0.6.6] — 2026-05-12

### Added

- Training → Create workout manually: Builder mode — structured interface to create workouts by steps, without needing to format text manually
- Training → Builder: step selector with CrossFit order (Mobility → Warm-Up → Strength → Skill → Conditioning → WOD → Accessory → Cool Down → Custom)
- Training → Builder: Mobility appears first and Warm-Up second in step suggestions
- Training → Builder: exercises visually nested under each section — clear hierarchy between block header and content
- Training → Builder: Enter on a field creates a new item; Backspace on an empty field removes the item and returns to the previous one
- Training → Builder: "Free text" button to switch to the classic textarea when needed
- Training → Create workout manually: Builder / Free text toggle at the top of the form

---

## [0.6.5] — 2026-05-12

### Added

- Training → Create / Import workout: saved text is now split into multiple sections by block headers (WARM UP, WOD, STRENGTH, SKILL, METCON, etc.) — each block becomes a separate step with the correct label, same format as AI-generated content

### Improved

- Training → Workout list: sections without structured exercises (imported or manual workouts) now display text with syntax highlighting — format lines in lime bold, movement names in white bold, notes in muted italic — instead of plain faded text
- Training → Workout list: "0 exercises" summary no longer appears when the workout is free text

---

## [0.6.4] — 2026-05-12

### Improved

- Training → Import workout from image: block detector rewritten — identifies the real start of the workout by the first section header (WARM UP, WOD, STRENGTH, SKILL, METCON, etc.), ignoring previous metadata such as "CLASS DETAILS", "IS WOD", "Workout-of-the-day"
- Training → Import workout from image: workout end detection by post-WOD metadata markers (REGISTRATIONS, BOOKING, SCHEDULE, CLASS DETAILS, etc.) — content after these markers is automatically trimmed
- Training → Import workout from image: OCR normalization — "3 rest" → "3' rest"; consecutive blank lines collapsed into one
- Training → Workout editor: improved syntax highlighting — format detects "5R, EACH FOR TIME", schemes like "21-15-9", "For Load", "Time Cap"; exercises detect distances (500/425m), calories (12 cal), more movement names (wall ball, kang squat, TTB, double under…); notes detect rest with apostrophe ("3' rest")

---

## [0.6.3] — 2026-05-12

### Added

- Training → Import workout from image: viewer with syntax highlighting — "Preview" / "Edit" button toggles between free textarea and styled preview
- Training → Create workout manually: same Preview/Edit toggle available in manual creation
- Training → Workout editor: block titles (WOD, Strength, Warm-Up…) highlighted in lime + uppercase; format lines (AMRAP, EMOM, For Time, Rounds…) with keywords in bold lime; exercise lines with numbers, weights and reps highlighted; notes/observations in muted italic

---

## [0.6.2] — 2026-05-12

### Added

- Training → Import workout from image: automatic detection of the workout block in the OCR text — identifies lines with exercises, sets, weights and formats (AMRAP, EMOM, etc.) and separates from noise
- Training → Import workout from image: "Trim — keep only the workout" button on the review screen; applies detected trim automatically (dates, usernames, loose phrases before/after the workout are discarded)
- Training → Import workout from image: "Restore full text" button to undo the trim and return to the original OCR

---

## [0.6.1] — 2026-05-12

### Fixed

- Training → Import workout from image: separated into two options — "Take photo" (camera) and "Choose from gallery" (without `capture`, accesses saved photos)
- Training → Import workout from image: image pre-processing before OCR — grayscale conversion, automatic inversion when dark background (average brightness < 100), and contrast normalization; significantly improves reading on dark-mode app screenshots
- Training → Import workout from image: detailed progress label per step (loading OCR, language, recognizing text)

---

## [0.6.0] — 2026-05-12

### Added

- Training → Create workout: "+" button in Workouts now opens a sheet with two creation options — available to all users
- Training → Create workout manually: editable text field + date selector, saves as a personal workout
- Training → Import workout from image: upload or photo capture with local OCR via Tesseract.js (por+eng), extracted text appears in an editable field for review before saving
- Training → Import workout from image: progress bar during OCR processing
- Training → Import workout from image: error handling (invalid image, OCR without text, processing failure)
- Training → Create workout: "Generate weekly plan" (AI) option kept in the same sheet for users with AI role

---

## [0.5.0] — 2026-05-12

### Added

- Training → Build-up: progression by fixed percentage table per number of sets (1–10), with larger jumps at the start and smaller ones near the target
- Training → Build-up: volume modifier — high volume (many sets × reps) shifts percentages down, conserving energy for the main workout
- Training → Build-up: movement category modifier — olympic/overhead more conservative; squat/hinge slightly more aggressive
- PRs & Insights → Build-up: orange alert when the target weight implies an estimated 1RM more than 10% above the best known 1RM from registered PRs
- Training → Build-up: `+X kg` delta display in green below each set, showing the increment relative to the previous set
- Training → Build-up: work set limit extended from 8 to 10

### Fixed

- Training → Build-up: the number of work sets entered by the user is now respected exactly — N sets = N visible sets (S1…SN)
- Training → Build-up: the last set is always the exact target weight (100%), with no extra sets generated by the app
- Training → Build-up: the empty bar is shown as warm-up and does not count as a work set
- Training → Build-up: weights rounded to the nearest integer, using small plates (0.5–2.5 kg) when necessary
- Training → Build-up: 5 kg and 0.5 kg plates in a darker color (`#52525B`) for better visual distinction

---

## [0.4.0] — 2026-05-12

### Added

- Training → Build-up: automatic warm-up set calculator from empty bar to target weight
- Training → Build-up: bar type selector (20 kg blue / 15 kg yellow)
- Training → Build-up: reps per set selector (1–15) and work sets selector (1–8)
- Training → Build-up: SVG bar visualization with colored plates at heights proportional to real diameter
- Training → Build-up: plate calculation per side with greedy algorithm (largest to smallest); shows "bar only" or "not mountable" as applicable
- Training → Build-up: "Build-up" button on the movement detail page (appears when a PR is registered)
- Training → Build-up: standalone `/buildup` page accessible via Profile → Calculators
- Training → Build-up: target weight suggestion based on athlete PRs via Epley formula
- Training → Build-up: "Calculators" section in Profile, visible to all users

### Fixed

- Training → Build-up: intermediate weights rounded to the nearest 5 kg multiple, ensuring mounting with available plates

---

## [0.3.1] — 2026-05-11

### Added

- PRs & Insights → Auth: mandatory email confirmation on sign-up
- PRs & Insights → Auth: custom SMTP via Gmail (`gounbrokenapp@gmail.com`)
- PRs & Insights → Auth: confirmation email template with Go Unbroken visual identity
- PRs & Insights → Auth: redirect URLs configured for production, Vercel preview and localhost

### Fixed

- PRs & Insights → Auth: `emailRedirectTo: window.location.origin` — email link returns to the correct environment
- PRs & Insights → Auth: removed `min-height:100vh` from email template that caused scrolling in Gmail

---

## [0.3.0] — 2026-05-11

### Added

- PRs & Insights → Onboarding: v2 flow with 5 steps (physical data, training, goals, first PR, completion)
- PRs & Insights → Profile: height field and "Prefer not to say" gender option
- PRs & Insights → Profile: multi-select training types and reformulated goals (8 options)
- PRs & Insights → Profile: delete own account with password confirmation
- Personal Trainer → Admin: delete user in dashboard with admin password confirmation
- PRs & Insights → App: automatic versioning via `package.json` on the login screen

### Improved

- PRs & Insights → Auth: login/signup layout centered on desktop (max 480px)
- Personal Trainer → Admin: responsive dashboard for desktop — 4 stats columns, 2×N grid, sheet as modal

---

## [0.2.0] — 2026-04-01

### Added

- PRs & Insights → App: rename CF Scores → Go Unbroken (name, icons, manifest, meta tags)
- PRs & Insights → App: "GO / lime bar / UNBROKEN" wordmark on the login screen
- PRs & Insights → App: PWA icons regenerated (192px, 512px, apple-touch-icon)
- PRs & Insights → Auth: confirmation email template with Go Unbroken visual identity
- PRs & Insights → Infra: stable preview URL `cf-scores-homolog.vercel.app` with `deploy:preview` script

---

## [0.1.0] — 2026-03-01

### Added

- PRs & Insights → App: initial setup — React 18 + Vite + TypeScript + Tailwind + PWA
- PRs & Insights → Auth: authentication via Supabase (email + password)
- PRs & Insights → Movements: create, list, search movements
- PRs & Insights → Scores: record weight/reps per movement, automatic PR logic
- PRs & Insights → History: evolution chart per movement
- PRs & Insights → Stats: volume, frequency and global PRs
- PRs & Insights → Profile: physical data and BMI
- PRs & Insights → Onboarding: v1 with basic data and first PR
- Personal Trainer → Admin: dashboard with role support (admin, personal, user)
- Personal Trainer → Personal area: prescriptions for athletes
- PRs & Insights → Infra: deploy on Vercel (cf-scores.vercel.app)
