# Study BYU — Sprint 3 final plan (for Claude Code)

Repo: `crehks/IS401byustudyspots` (currently on branch `dev-page-implementation`). Backend: Supabase project `nfbiqxoztpggfhbonqfy` ("Study Spot Website"). Host: **Vercel**. Goal: meet the full Definition of Done and the grading rubric.

Tags used below: **[verified]** seen in code/DB, **[inferred]** reasoned, check it, **[unverified]** not checked.

## Ground rules
- Never `git commit` / `git push` / merge without explicit go-ahead from the user.
- Ask before applying any migration or config change to the live Supabase project, or any Vercel deploy action.
- Never fabricate OKR data: no manually inserted rows to hit targets.
- No secrets in the repo or the browser: only the `sb_publishable_` key is allowed client-side. Don't put the TA/demo password in the README.
- Vanilla JS, existing style (IIFE modules, `esc()` on all interpolated text, `database.js` request wrapper). Minimal comments, brief rationale before code.
- Keep `npm test` green; add tests for new logic.
- RLS is the real security gate; UI hiding is cosmetic.

## Rubric → work map (100 pts)
| Rubric item | Pts | Work |
|---|---|---|
| 5 fully functional pages, end-to-end live | 11 | §2 pages, §6 QA |
| AI workflow automation | 10 | §4 |
| Live on cloud + short URL/QR + merged to main | 5 | §1 |
| Responsive desktop + mobile | 5 | §5 |
| Lighthouse Accessibility ≥ 90 | 4 | §5 |
| OKR video ≤ 90 s | 4 | §3, §8 |
| README with Level 0 + Level 1 DFDs | DoD | §7 |
| Presentation / demo / peer / scrum / hours | rest | §8 |

## Current state (as of last check)
- [verified] Supabase Auth login/signup/logout; `User`, `Favorites`, `FavoritesList`, `SpotSubmission`, `ReportSpotStatus`, `spot_reports`, `SiteRating`, `BuildingHours`, `StudySpot`, `Buildings`, etc., all RLS-enabled.
- [verified] AI step exists: Edge Function `tag-report` calls Gemini to classify signed-in reports (`spot_reports`), with a `pg_cron` retry every minute.
- [verified] `index.html` is a single-page app with 3 views (Explore, Building, Saved) + `admin.html`/`admin.js` (admin maintain tools added by another session; **[unverified]** whether CRUD and RLS are complete — audit per the earlier maintain spec).
- [verified] No OKR tracking in code. README has no DFDs or Lighthouse results.
- [verified] Not deployed; branch is not `main`. `server.mjs` is a localhost-only dev server; static hosting uses the `supabase-config.js` fallback.
- [inferred] Live catalogue row counts were reported as 0 for `Buildings`/`StudySpot` (possibly stale stats). Verify with `count(*)`.

## 1. Deploy to Vercel (do first — everything else depends on a live URL)
1. Confirm `.env` is in `.gitignore` and not tracked; confirm `supabase-config.js` contains only the project URL + `sb_publishable_` key.
2. Vercel project from the GitHub repo: framework "Other", **no build command**, output directory = repo root. `server.mjs` is not used on Vercel. Optional `vercel.json` (`cleanUrls: true`, basic security headers). Make sure `admin.html`, the new OKR page, and `assets/` are served.
3. Short project name/URL (e.g. `studybyu.vercel.app`) — **[unverified]** availability; pick something easy to type. Keep it ≤ ~15 characters.
4. Supabase dashboard (ask the user first): Auth → URL config: set **Site URL** to the production URL and add it (and the preview pattern if wanted) to the redirect allow-list. `auth.js` builds the email-confirm redirect from `location`.
5. Verify the `tag-report` Edge Function's CORS allows the Vercel origin (it sets CORS headers; check the `Access-Control-Allow-Origin` value).
6. Production branch = `main`. Open a PR from `dev-page-implementation` → `main` **only when the user says so**; deploy from `main`.
7. Smoke test on the live URL: load, login, report, favorites, admin, AI tag. Test from a phone on cellular.
8. Keep the Supabase project from pausing (free tier pauses on inactivity): open the project/dashboard within a day or two of the presentation.
9. Generate a QR code PNG for the final URL (`qrcode` npm or any generator); put it in `docs/` and plan to show it on a slide. Test it from a phone off Wi-Fi.

**Presentation-day friction (important):**
- [inferred] Supabase email confirmation is ON (documented). With dozens of classmates signing up, the free-tier email rate limit will trigger `over_email_send_rate_limit` (already handled in `auth.js` messaging) and block sign-ups. Ask the user to either turn confirmation off for demo day, or provide a shared demo login. Everything except favorites/AI reports must also work as a guest.
- Gemini free-tier rate limits: tagging has a fallback model and a cron retry; verify a burst of ~20 reports doesn't leave reports stuck `pending` visibly.

## 2. Five pages (confirm counting with the instructor; default below)
1. **Explore** (campus map + filters + recommendations)
2. **Building** (floor plans, spot details, report, reserve link)
3. **Saved / My Nooks** (favorites lists; needs login)
4. **Admin / Maintain** (`admin.html`: Users + Records CRUD, admin-only)
5. **Impact / OKR dashboard** (new, §3)

Make each reachable from nav so a grader sees five distinct destinations. Each must work end-to-end: frontend → Supabase → DB and back, live in the demo. Add a nav link for the dashboard; keep the admin link admin-only.

## 3. OKRs (new) — final wording, tracking, build
Requirement: 2 Objectives × 2 Key Results, computed from real user activity, auto-updating, demonstrable in ≤ 90 s. **Use this exact wording** on the dashboard, README, and FigJam:

**Objective 1: Reduce friction and frustration for students by showing study spots that fit their needs**
- **KR1:** Increase the percentage of students who report an available study spot on arrival from 0% to 50%.
- **KR2:** Reduce the average time students take to choose a study spot in the app from 3 minutes to 60 seconds.

**Objective 2: Provide a consistent, quality experience for long-term users**
- **KR1:** Increase the percentage of registered users who sign in 2+ times within 14 days from 0% to 50%.
- **KR2:** Increase the percentage of registered users who submit more than one report within 14 days from 0% to 40%.

Dashboard labels: O1-KR1, O1-KR2, O2-KR1, O2-KR2. Baselines are 0% / 180 s by definition; all new tracking starts empty, so no seeded rows distort the numbers. **Never insert fake rows to hit targets**; real activity only.

### Metric definitions
| KR | Computed as | Source | Notes |
|---|---|---|---|
| O1-KR1 | `count(was_available = true) / count(was_available is not null)` over arrival reports | New `was_available boolean` on `spot_reports` and `ReportSpotStatus` | "Arrival report" = the existing "Once you arrive…" modal [verified in `app.js`]. Add a required Yes/No: "Was this spot available when you arrived?" Guests and signed-in users both count (KR says "students"). Rows with null are excluded; show 0% / "no data yet" when none. |
| O1-KR2 | `avg(seconds)` of choose-spot events; progress = `(180 − avg) / (180 − 60)` clamped 0–100% | New table `public.spot_choice_events` | Lower is better. Timer starts at app load (or after the previous choice) and stops when the student clicks "Choose this spot". Client ignores values < 1 s or > 1800 s; DB check `seconds between 1 and 3600`. Describe it in the UI/README as "time to choose a spot in the app" (a proxy, not real-world search time). |
| O2-KR1 | `count(users with ≥ 2 sign-ins in last 14 days) / count(registered users)` | New table `public.user_sign_ins` | Registered = `"User"` rows where `auth_id is not null` (guest/demo rows excluded). Count **password sign-ins only**, not session restore or token refresh, so refreshing the page doesn't inflate it. |
| O2-KR2 | `count(users with ≥ 2 reports in last 14 days) / count(registered users)` | Existing `spot_reports` (`user_id` = `auth.users.id`) | Signed-in reports only [verified: signed-in path writes `spot_reports`; guests share user 1001 in `ReportSpotStatus` and can't be counted per person]. Count all submitted reports regardless of AI status (pending/approved/rejected). |

### Implementation
1. **Migration** `supabase/migrations/<date>_okr_tracking.sql` (idempotent; **ask the user before applying to the live project**):
   - `alter table public.spot_reports add column if not exists was_available boolean;` same for `public."ReportSpotStatus"`. **Check existing insert grants/RLS**: `ReportSpotStatus` uses a column-level grant (`insert(spot_id, noise_level, crowd_level, notes)`) and guest/user insert policies; `spot_reports` has `spot_reports_insert_own`. Extend grants and policy checks so the new column can be inserted by the same roles that can insert reports today, and nothing else.
   - `public.spot_choice_events (event_id bigint generated by default as identity primary key, created_at timestamptz not null default now(), seconds integer not null check (seconds between 1 and 3600))`; RLS on; `anon`/`authenticated` get **insert only** on `seconds`; no select/update/delete.
   - `public.user_sign_ins (id bigint generated by default as identity primary key, user_id bigint not null references public."User"(user_id) on delete cascade, signed_in_at timestamptz not null default now())` with an index on `(user_id, signed_in_at)`; RLS on; no browser access. Populate it with a `security definer` trigger on `auth.users` `after update of last_sign_in_at` that inserts a row for the linked `"User"` (match `auth_id = new.id`). **[unverified]** confirm the trigger fires on a password sign-in and not on token refresh; if not, fall back to a client insert in `auth.js` `signIn()` only (RLS: authenticated may insert `user_id` = own).
   - `public.okr_metrics()` → one `jsonb`, aggregates only, `security definer stable set search_path = ''`, `revoke ... from public; grant execute to anon, authenticated`:
     `{ o1k1: {available, answered, pct}, o1k2: {avg_seconds, n, progress_pct}, o2k1: {users, registered, pct}, o2k2: {users, registered, pct}, generated_at }`. Use a rolling `now() - interval '14 days'` window; guard divide-by-zero (return 0).
2. **App changes**:
   - Arrival modal: add the required Yes/No question; `database.js` submit paths send `was_available` for both guest and signed-in reports.
   - `app.js`: keep a `searchStartedAt` timestamp (set at load, reset after each choice); on "Choose this spot", compute seconds and call a new `database.logChoice(seconds)` (fire-and-forget; failures silent).
   - `database.js`: `loadOkrs()` → `POST /rest/v1/rpc/okr_metrics`, `cache: 'no-store'`.
3. **Dashboard page** `okr.html` + `okr.js` (nav link "Impact"): two objective sections; each KR card shows baseline → current → target, a progress bar, the raw counts behind the percentage (e.g. "3 of 6 users") so small samples read honestly, and "Last updated". Poll every ~5 s while the tab is visible. Flash/animate on change so the video shows it clearly. Accessibility: real headings, `role="progressbar"` with `aria-valuenow/min/max`, `aria-live="polite"` only on the updated-time text. Targets/baselines in one config object.
4. **Tests**: SQL (PGlite under `tools/`) for `okr_metrics` math (zero data, partial data, window edges, guest exclusion) and that `anon` can't read events/sign-ins; client tests for timer reset/clamping, `was_available` payload, and dashboard progress formulas (including inverse progress for KR2).
5. **Video prep**: create a real demo account and perform real first actions beforehand (1 report, 1 sign-in) so the on-camera action crosses the "2+" threshold. Do not insert rows manually.

## 4. AI workflow automation (verify it, don't rebuild)
- [verified] Flow: signed-in report → `spot_reports` row (pending) → app POSTs `functions/v1/tag-report` → Gemini returns `{valid, noise, crowd, reason}` → function updates the row; `pg_cron` retries pending rows every minute.
- Tasks: confirm the function is deployed and `GEMINI_API_KEY`/`CRON_SECRET` secrets are set; confirm the Vault secret exists for cron; end-to-end test on the **production URL**; make the result visible in the UI (e.g., "AI-checked" badge or the reason on the report) so the demo shows the AI step working; handle the failure state (still pending → friendly message). Add a short architecture note to the README.
- Describe it as "external service + AI step that classifies input" in the presentation.

## 5. Responsive + Lighthouse Accessibility ≥ 90
- Test widths 360, 390, 768, 1024, 1440 on all five pages: no overflow, overlap, clipped text, or untappable controls (≥ 44 px targets). Pay special attention to the SVG floor plans, the campus map, modals, and the admin tables (horizontal scroll container on mobile).
- Run Lighthouse (mobile + desktop) against the **deployed** URL for each page; record scores for the README. Fix typical failures: color contrast in the dark theme, missing accessible names on icon buttons/SVG hit targets, form labels, heading order, landmarks, `lang`, `meta viewport`, focus visibility. Earlier notes show a 100 on one page before later changes — rerun [verified].
- Test on a real phone.

## 6. End-to-end QA checklist (live URL)
Guest: browse, filters, map, building view, submit report, suggest spot, reserve link opens BYU. User: sign up/login, save favorites, AI-tagged report, logout. Admin: login, Maintain Users/Records (create/edit/delete), logout hides tools, non-admin gets nothing. OKR page: all four numbers change after the matching actions. Confirm no console errors and that failed network calls show friendly errors.

## 7. Docs (user will ask Claude to do this near the end)
- README: project overview, live URL, architecture (Vercel + Supabase + Gemini), setup, OKR definitions and how they're computed, AI workflow description, Lighthouse scores, **embedded Level 0 and Level 1 DFDs**. Level 1 image exists (`level1_dfd_logical.png`, 5 processes in the slide's style; 12 arrows cross the boundary). **Level 0 still needs to be drawn**: one process "Study BYU Platform", same 12 boundary flows, entities Student, Admin, Google Gemini API, BYU Reservations. Save images to `docs/` and embed with relative paths.
- Update `docs/FILE_GUIDE.md` for new files; remove stale references to `"Study Spot"` (the live table is `StudySpot`).
- No credentials in the README.

## 8. Non-code deliverables (checklist for the team)
- **KR video (≤ 90 s):** keep the dashboard visible (second window/split view) so each number's change is on camera. Order: choose a spot (O1-KR2 average time updates) → answer "Yes" on the arrival report (O1-KR1 % rises) → log out and back in as the prepared demo user (O2-KR1) → submit a second report as that user (O2-KR2). Pre-warm so nothing stalls and trim waiting if needed. Upload (unlisted YouTube/Drive, anyone-with-link), paste the link into the FigJam Sprint 3 OKR section.
- **FigJam:** copy the Module 11 template next to Sprint 1/2 as a section named "Sprint 3"; Product Owner fills every part and submits the Figma page link.
- **Presentation (5 min, every member speaks):** problem (why finding a study spot is painful), how we got here, live demo, close. Demo order: Explore → Building (report + reserve link) → AI-tagged report appearing → Saved → Impact/OKR numbers moving → Admin. Show a QR code + short URL on screen; tell classmates a shared demo login if email confirmation is off. Run a full timed rehearsal with handoffs.
- **Scrum/hours:** attend all 3 dailies; log estimate vs actual per task honestly.
- **Evaluations:** every member completes the Canvas quiz before leaving class.

## Suggested order
1) Deploy skeleton to Vercel + Supabase auth URLs → 2) OKR migration + dashboard → 3) verify/finish admin + AI visibility → 4) responsive + Lighthouse pass on the live site → 5) QA checklist → 6) README + DFDs → 7) merge to `main` (with go-ahead) and redeploy → 8) video, FigJam, rehearsal.
