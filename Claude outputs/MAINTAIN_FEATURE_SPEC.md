# Spec: Admin "Maintain" feature (IS 401 sprint rubric) — Study BYU

Audience: Claude Code, working in this repo. Goal: close the gap between the current app and the rubric below (deployment excluded).

## Ground rules
- Never `git commit` / `git push` without explicit go-ahead.
- Ask before applying any migration to the live Supabase project (`nfbiqxoztpggfhbonqfy`, "Study Spot Website"). The other project ("IS 401 2026F Aquarium") is unrelated.
- Never put a service-role/secret key in the browser. `server.mjs` already rejects non-publishable keys; keep it that way.
- Minimal comments, brief rationale only. Match existing style (vanilla JS, IIFE modules on `window`, `esc()` for all interpolated text).
- UI hiding is cosmetic. **RLS is the real gate** — every admin capability must be enforced in SQL.

## Rubric → status
| Requirement | Status | Work |
|---|---|---|
| Professional landing page, ≥1 image | Partial | Only `<img>` in `index.html` is the small nav logo (`assets/nook-logo.png`); the map is SVG. Add a real hero `<img>` (e.g. `assets/nook-books.png`, with `alt`, `width/height`). Verify visually. |
| Login (email + password) | Done | Supabase Auth via `auth.js`. |
| After login: "Maintain Users" + "Maintain Records" buttons | **Missing** | Below. |
| Per-table hidden maintain button, shown after login | **Missing** | Below. |
| Create / Read / Update / Delete on each maintained table + users | **Missing** | Only create+read exist; the one DELETE in `database.js` is favorites-only. |
| Logout removes cookies + hides buttons | **Wrong** | Session is in `localStorage`, no cookie. |
| TA URL + working credentials | Out of scope here | Needs an admin account (below) + deployment (IS 404). |

## Verified facts about the current code/DB (don't re-derive)
- `auth.js`: `StudyAuth(database, storage)` — **storage is injectable** (`getItem/setItem/removeItem`), key `studybyu.auth.v1`. `signOut()` → `setSession(null)` → `store()` → `removeItem`. `emit()` notifies `onChange` listeners. `loadProfile()` selects `user_id,first_name,last_name` from `User`.
- `database.js`: `request(url, opts)` (12s timeout), `headers(extra)` (adds apikey + `Bearer accessToken`), `apiError(response)`, `listUrl(table, URLSearchParams)`. Only create/read plus one favorites DELETE.
- Live public tables: `Buildings, Floors, StudySpot, SpotType, User, ReportSpotStatus, Resources, ResourceType, Reservable, StudySpotsFavorites, Favorites, FavoritesList, SpotSubmission, BuildingHours, SiteRating, spot_reports` — all RLS-enabled. **Table is `StudySpot`, not `"Study Spot"`** (older docs/SETUP_ACTUAL_SCHEMA.sql use the spaced name — stale).
- `User`: `user_id bigint identity, created_at, first_name, last_name, auth_id uuid unique → auth.users(id)`. No email, no role. RLS: authenticated may SELECT own row only; no writes. Row 1001 is the shared guest user (`auth_id` NULL) — never delete or demote it.
- `StudySpot`: `spot_id, created_at, spot_type_id→SpotType, building_id→Buildings, floor_id→Floors (composite FK floor_id+building_id), outlets bool, capacity bigint, spot_location text, reservable bool, group_type text`.
- `SpotSubmission`: `submission_id, user_id→User, building_id, floor_number, floor_label, spot_name, spot_type_id, capacity, noise_level(1-3), outlets, is_private, location_details, status('pending'|'approved'|'rejected'), approved_spot_id→StudySpot`.
- FKs from `ReportSpotStatus`, `SpotSubmission`, `FavoritesList` → `User` and from `ReportSpotStatus/Reservable/Favorites/StudySpotsFavorites/SpotSubmission/spot_reports` → `StudySpot` appear to have **no cascade** → naive deletes fail with `23503`.
- Row counts reported by the tool were `0` for Buildings/StudySpot — likely stale stats. **Check with `count(*)`** before assuming the catalogue is empty.
- `database.js` hard-maps sample spot IDs 1001–1025 (`numericSpotIds`) and building IDs 1001–1003. Editing/deleting those rows can break the map→report linkage; the UI must show a clear error, not crash.
- **Check `server.mjs`'s allowed-public-files list** and `tools/package.mjs`: any new browser file (`admin.js`) must be added to both or it 404s / is omitted from the ZIP.

## Open decision (default chosen; keep unless user overrides)
Rubric text reads "if the user logs in, show the buttons." Default: show maintain buttons **only to `is_admin` users**, and give the TA an admin account. Reason: otherwise any self-signup could delete users. Fallback if the user wants literal compliance: show to all logged-in users but RLS still blocks non-admins (they'd see permission errors) — not recommended.

Button naming (interpretation of "per-table hidden button"): after admin login show **"Maintain Users"** and **"Maintain Records"**. "Maintain Records" opens the admin view with a tab button per table: **Spots** (`StudySpot`), **Submissions** (`SpotSubmission`), **Buildings** (`Buildings`). "Maintain Users" opens the same view on `User`. All hidden (`hidden` attr) until `auth.isAdmin`.

## 1. Migration — `supabase/migrations/20261109_002_admin_maintain.sql`
Idempotent (`if not exists`, `drop policy if exists`, `create or replace`).

1. `alter table public."User" add column if not exists is_admin boolean not null default false;`
2. `alter table public."User" add column if not exists email text;` — backfill from `auth.users` (`update ... from auth.users`), and `create or replace` `handle_new_auth_user()` to also store `new.email`. Keep its `security definer`, `set search_path = ''`, revoke-execute lines.
3. `public.is_admin()` — `language sql stable security definer set search_path = ''`: `select exists (select 1 from public."User" where auth_id = (select auth.uid()) and is_admin)`. `revoke execute ... from public, anon; grant execute ... to authenticated;`. (security definer avoids recursive RLS on `User`.)
4. Table privileges (existing migration did `revoke all` + column-level grants): `grant select, insert, update, delete on` `"User", "StudySpot", "SpotSubmission", "Buildings"` `to authenticated`. Existing narrow insert policies still apply to non-admins; with no select/update/delete policy for them, those return nothing/denied.
5. Admin policies, one per table, `for all to authenticated using (public.is_admin()) with check (public.is_admin())`. Use `(select public.is_admin())` form for plan caching. Name them `admin_all_<table>`.
6. Ensure `anon` cannot select `User`, and that no policy lets a non-admin set `is_admin` (they have no UPDATE policy on `User`, so this holds — assert in tests).
7. `public.admin_delete_user(p_user_id bigint) returns void` — `security definer`, `set search_path = ''`:
   - raise if `not public.is_admin()`; raise if `p_user_id = 1001`; raise if target's `auth_id = auth.uid()` (no self-delete).
   - Reassign `ReportSpotStatus` and `SpotSubmission` rows from the target to user 1001; delete target's `Favorites` rows (via their lists), then `FavoritesList` rows.
   - **Before writing, query `pg_constraint` for the real ON DELETE rules** on every FK to `User` and to `auth.users` (including `spot_reports.user_id`) and handle each.
   - If `auth_id` is not null: `delete from auth.users where id = auth_id` (cascades to `User`). Else `delete from public."User" where user_id = p_user_id`.
   - `revoke execute from public, anon; grant execute to authenticated`.
8. Seed/promote admin (run manually, not in the migration file, so no credentials land in the repo): create the TA user in Supabase Dashboard → Authentication → Add user with **Auto Confirm** (email confirmation is on), then `update public."User" set is_admin = true where auth_id = '<uuid>';`.

## 2. `auth.js`
- Add a `cookieStorage` adapter (`getItem/setItem/removeItem`) and pass it as the `storage` argument where `StudyAuth` is constructed (find in `app.js` startup). Cookie `studybyu.auth.v1`, value `encodeURIComponent(json)`, `path=/; SameSite=Lax`, add `Secure` when `location.protocol === 'https:'`, `Max-Age` ≈ 7 days (refresh token governs real validity). `removeItem` sets `Max-Age=0`. Session JSON is ~1.5 KB — under the 4 KB limit; guard with try/catch and fall back to memory.
- On startup also `localStorage.removeItem('studybyu.auth.v1')` to drop legacy sessions.
- `loadProfile()`: select `user_id,first_name,last_name,is_admin`; add `get isAdmin() { return !!this.profile?.is_admin; }`.
- Logout must leave no cookie and clear in-memory state (already does via `setSession(null)`); confirm `emit()` fires so the UI re-renders.

## 3. `database.js` — generic REST helpers
Add on `StudyDatabase` (all via `this.request` + `this.headers`; send `Prefer: return=representation` on writes):
- `select(table, {select='*', order, limit=50, offset=0})` → returns `{rows, total}` (use `Prefer: count=exact` and parse `Content-Range`).
- `insert(table, row)`, `update(table, pk, id, patch)` (`PATCH ?pk=eq.id`), `remove(table, pk, id)` (`DELETE ?pk=eq.id`), `rpc(fn, args)`.
- Update/delete must treat **0 returned rows as failure** ("not permitted or not found") — PostgREST returns 200/204 with no rows when RLS filters everything.
- Extend `apiError` mapping: `23503` → "In use by other records — remove or reassign those first", `23505` → duplicate, `23514`/`22P02` → invalid value, `42501`/403 → "Admin access required". Do not leak raw messages.

## 4. `admin.js` (new) + `index.html` + `app.js`
- `window.StudyAdmin.init({ db, auth, openModal, modalHeader, esc, showToast })`, called from `app.js` startup, so `admin.js` doesn't depend on `app.js` globals. Load via `<script src="admin.js">` after `database.js`/`auth.js`; add to `server.mjs` allowlist and `tools/package.mjs`.
- `index.html`: add `#navMaintainUsers` and `#navMaintainRecords` buttons next to `#navAuth` (both `hidden`), and a `#adminView` section (hidden) with a tab row, table, pager, and "Add" button.
- Visibility: one `renderAuthState()` run on `auth.onChange` and at startup: show buttons iff `auth.signedIn && auth.isAdmin`; on logout hide buttons, hide `#adminView`, return to the main view.
- Config-driven; one generic component, ~10 lines per table:
  - `users`: `User`, pk `user_id`; columns `user_id`(ro), `first_name`, `last_name`, `email`(ro), `is_admin`(bool), `created_at`(ro). Create inserts a **profile-only row (auth_id NULL, cannot log in)** — label this in the UI. Delete → `rpc('admin_delete_user')`. Disable edit/delete controls for row 1001; disable self-delete and self-demote.
  - `spots`: `StudySpot`, pk `spot_id`; `spot_type_id`/`building_id`/`floor_id` as dropdowns (load `SpotType`, `Buildings`, `Floors` once; show names), `outlets`, `reservable` (bool), `capacity` (int ≥ 0), `spot_location`, `group_type`.
  - `submissions`: `SpotSubmission`, pk `submission_id`; `status` dropdown (pending/approved/rejected), other fields per DB checks (name 3–60, capacity 1–8, noise 1–3).
  - `buildings`: `Buildings`, pk `building_id`; `building_name`, `building_location`, `opening_hrs`, `closing_hrs` (time), `reservation_url`.
- Field types: `text | int | bool | time | select | readonly`. Client-side validation mirrors DB checks, but DB is authoritative; show `apiError` text in the modal's error line.
- Delete: confirm via the existing modal (not `window.confirm`); optimistic UI is not needed — reload the page of rows after each write.
- Accessibility/style: reuse existing modal, `primary-button`/`secondary-button`, form-field classes; dark/blue theme per styles.css; keyboard-reachable table actions with `aria-label`s; responsive table (horizontal scroll container on mobile).

## 5. Tests (extend existing `node --test` suite; keep `npm test` green)
- `tests/auth.test.mjs`: cookie adapter round-trips and clears on `signOut`; legacy localStorage key removed; `isAdmin` reflects profile.
- `tests/database.test.mjs`: `select/insert/update/remove` build the right URLs/headers; 0-row PATCH/DELETE → error; `apiError` mappings.
- New `tests/admin.test.mjs` (linkedom): buttons hidden when anon / non-admin, visible when admin, hidden again after logout; per-table config renders correct columns.
- SQL (PGlite integration under `tools/`): as non-admin, SELECT/UPDATE/DELETE on `StudySpot`/`User`/`SpotSubmission`/`Buildings` affects 0 rows and `is_admin` can't be changed; as admin all four ops work; `admin_delete_user` handles a user with reports + favorites, blocks self and 1001.

## 6. Manual acceptance on the live project (after go-ahead to migrate)
1. Anonymous: no maintain buttons; REST `PATCH StudySpot` with the publishable key returns no rows/403.
2. Normal signed-up user: no buttons; same REST attempts fail.
3. Admin: buttons appear; full create/read/update/delete on Users, Spots, Submissions, Buildings; verify rows in Supabase Table Editor.
4. Delete a user that has reports and favorites → succeeds; guest 1001 and self-delete blocked.
5. Refresh while logged in → still admin; `document.cookie` shows the session cookie.
6. Logout → cookie gone, buttons + admin view hidden, subsequent admin REST call fails, refresh stays logged out.
7. Landing page shows the hero image at desktop and mobile widths.
8. Fresh browser profile + the TA credentials → login works end-to-end on the deployed URL (IS 404 step).

## Suggested order (smallest path to a passing demo)
Migration + admin account → `auth.js` cookie/isAdmin → `database.js` helpers → `admin.js` with `spots` + `users` first → remaining tables via config → hero image → tests → live acceptance.

## Out of scope / caveats
- Deployment (IS 404): note `server.mjs` binds 127.0.0.1 and README says GitHub Pages can't run it; the `supabase-config.js` static fallback exists. Decide hosting separately.
- Admin-created users cannot log in (profile-only). Creating loginable users stays via the normal sign-up flow.
- Don't commit the TA password to the repo; hand it over only in the submission.
