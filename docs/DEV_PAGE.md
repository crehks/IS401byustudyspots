# Dev page (test branch: dev-page-implementation)

Admin area at `/admin.html`: landing page, login, admin-code unlock, Maintain Users, Maintain Records (CRUD) and a map pin-drop.
Nothing here touches the live Supabase project. Do not merge or apply the SQL without team approval.

## Run it
1. `npm run dev:backend` (local PGlite stand-in for Supabase, port 54321, resets on restart).
2. `npm start`, then open http://127.0.0.1:3000/admin.html.
3. Demo accounts and the admin code are in `tools/dev/seed.sql` (fabricated, local only).
4. `npm run test:admin` runs the auth-matrix tests against the real migration SQL.

## Files
- `admin.html`, `admin.css`, `admin.js`: the page. It connects like the main site: the server's `/api/config` first (local `.env` or `tools/dev/local.env`), then `supabase-config.js` on static hosting.
- `supabase/migrations/dev-page/`: admin gate (codes, sessions, RLS) and map coordinates. Files only, never applied to live.
- `supabase/functions/admin-users/`: Edge Function for Maintain Users. Not deployed.
- `tools/dev-backend.mjs`, `tools/dev/`: local backend, schema fixture, seed.

## Gate in short
Admin = `app_metadata.role = 'admin'` plus a personal code checked by `unlock_admin()`. A correct code opens a 2-hour database
session; every maintained table's RLS policy requires it. Five wrong codes lock the account for 15 minutes. Hiding buttons is only UX.

## Known limits
- Cookies are set from JS (no HttpOnly in a static SPA). Logout deletes them.
- A demoted admin keeps the old JWT role until the token refreshes (up to 1 hour).
- Seed coordinates are rough placeholders. Imagery can be a few meters off the street map. Pins are 2D.
- Real Supabase Auth, email confirmation and the Edge Function are not exercised by local tests.
- Leaflet and tiles load from CDNs (cdnjs, Esri, OpenStreetMap); check current tile terms before production use.
- Hero image is a screenshot of the app; swap `assets/admin-hero.jpg` for a real photo.

## Floor-plan pins (Study Spots)

Maintain Records > Study Spots opens in **Floor plan** mode. Pick a building and a plan sheet (the digitized plans in `*-plans.js`), click the plan to drop a pin, fill in the details, save. Drag a pin to move it (then "Save new position"); click a pin to edit or delete it.

- Position is stored on `StudySpot` as `plan_key` (sheet, e.g. `L1`) and `plan_x`/`plan_y` (percent of the drawing, same convention as `app.js`). Migration: `supabase/migrations/dev-page/20261111_003_floor_plan_pins.sql` (file only, not applied to live).
- Free click: pins go exactly where you click. The name is only a suggestion (nearest room number, if one is close) and is editable.
- Every detail is required (name, type, capacity 1-8, solo/group, outlets, reservable). The form enforces it, and `20261111_004_spot_soft_delete_and_required.sql` enforces it in the database for any spot with a plan position.
- Delete is a soft delete (`deleted_at`). Deleted spots move to "Recently deleted" under the plan, where they can be restored.
- The floor row is found (or created) from the sheet: `B` = 0, `G` = 1, otherwise the digits in the key.
- Buildings are matched to plan sets by name (Library, Wilkinson, Knight/JKB).
- The consumer app does not read StudySpot yet (its spots are the hardcoded `DEMO_SPOTS` in `app.js`), so it must be changed to read non-deleted rows before dev edits show on the main page.

## Main site link (spots and resources on the real floor plans)

- **Run both pages locally against the test backend:** `npm run dev:backend` then `npm run dev:app` (the main site at `/`, the dev page at `/admin.html`). `dev:app` reads `tools/dev/local.env`, never the real `.env`.
- **What the main site shows:** once at least one spot is pinned, the main site lists pinned spots (from `StudySpot`) instead of the built-in samples, drawn on the same digitized plans at the stored percent position. Pinned resources appear as amber square pins (tap for details). Soft-deleted and unpinned rows never appear. If the pin columns do not exist yet, or nothing is pinned, the built-in samples stay.
- **Ids:** pinned spots use `db-<spot_id>`. Their numeric `spot_id` is what reports and saved lists store, the same way the samples use 1001+.
- **Admin menu:** on the main site, the Log out button logs out on click for everyone except admins, who get a small menu (Dev tools, Log out). Showing it is cosmetic; the database still decides who can edit. Logging out also ends the admin unlock and clears the dev-page cookies.
- **One login:** the dev page adopts the main site's saved login (same origin), then asks only for the admin code. Its own login box remains for direct visits.
- **Required spot details** (name, type, capacity, solo/group, outlets, reservable, private, typical noise) mirror what the main site filters on and what reports need.
- **Going live (status, 2026-11-11):** migrations 001-007 are **applied to the live project** (run from `supabase/live-apply/dev-portal-all-in-one.sql` plus 007) and verified: main-site reads unchanged, CRUD simulated with rollback, floor lock, report rules. The `admin-users` function is **deployed** (verify_jwt on; refuses everyone who is not an unlocked admin). **Not done yet:** promote each admin (`app_metadata.role = 'admin'` on their auth account) and set each admin's own code (snippet at the bottom of `20261111_001_admin_gate.sql`, never commit a real code). Main-site code (`app.js`, `database.js`, `auth.js`, `styles.css`) is on the test branch only; live site is unchanged until it is merged. `supabase/rollback/dev-page-rollback.sql` reverses the database changes.
- **Live findings that required the grants/report migration (006):** `authenticated` had no write rights on `Buildings`/`StudySpot` and no rights at all on `Floors`/`SpotType`; the old report policies only allowed spot ids 1001-1025; `anon` held write/TRUNCATE rights on `Resources`, `ResourceType`, `BuildingHours` (blocked only by RLS, now revoked).
- **Users:** deleting an account that owns reports or submissions is refused with "Disable it instead" (foreign keys); disable it in Edit user.

## Round 2 changes (2026-11-12)

- **Pins on the main site:** pinned spots show their **capacity** as the pin label (1 for a solo carrel, 4 for a 4-person table). The built-in sample spots stay as a backup beside them with S1, S2... labels. To hide the samples later, set `SHOW_SAMPLE_SPOTS=false` in `app.js` (or delete `DEMO_SPOTS`).
- **Study Spots / Resources pages:** Floor plan is the first and default tab, Table second. The Add button becomes "Add on floor plan" (no form). Edit and Delete stay in the Table so rows without a pin (the sample rows) can still be managed. The campus Map tab is gone for spots (it stays for Buildings); spots no longer show latitude/longitude.
- **Noise:** Quiet (stored `low`/1) and Social (stored `medium`/2) are the only options on every form. Migration 008 converts old High values to Social, adds check constraints, and adds *coercion triggers* so the old live site (which may still send High) keeps working until the new code is merged. After the merge, drop the three `noise_quiet_social_trg` triggers. The `tag-report` function now only returns low or medium noise.
- **Protected accounts:** an account with `app_metadata.protected = true` (the Test User) cannot be deleted by the portal, the function, or the Supabase dashboard (migration 009). To delete one on purpose, clear the flag first.
- **Live run script:** `supabase/live-apply/round2-live-changes.sql` (duplicate HBLL #1 removal with a move to #1001, migrations 008 and 009, and the protected flag). Restore script for building 1: `supabase/rollback/restore-duplicate-hbll-1.sql`.
