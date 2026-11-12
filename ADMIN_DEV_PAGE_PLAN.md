# Admin / Dev Page + Map Pin-Drop — Implementation Strategy

Project: BYU study-spot finder (IS 401, Group 2). Backend: Supabase. Domain: AWS.
Audience: Claude Code. Goal: assess feasibility, then build in phases.

## 0. Ground rules for Claude Code

- Do NOT `git commit` or `git push` without explicit go-ahead from the user.
- Minimal code comments. Brief rationale before code; no line-by-line narration.
- Do NOT apply migrations to the live Supabase project without showing the SQL and getting approval. Write migrations as files first.
- The Supabase service-role key must never appear in frontend code, frontend env vars (no `VITE_`/`NEXT_PUBLIC_` prefix), or the repo. Frontend uses only the publishable/anon key.
- Flag inference vs. verified fact in every report. If something was not run or tested, say so.
- Phase 0 is a gate: finish it and report before building anything.

## 1. Phase 0 — Discovery and feasibility (report back, no building)

1. Detect the stack from the repo: framework (React/Vite, Next.js, SvelteKit, plain HTML/JS...), router, styling, package manager, existing Supabase client setup, hosting/deploy config.
2. Inspect the live schema via Supabase MCP (`list_tables`, `list_extensions`, RLS status via `get_advisors`). List every table the app already has and which ones need a Maintain page.
3. Check whether a map library is already used (Leaflet/Mapbox/Google). Default to Leaflet if none.
4. Check how auth is currently done and whether public signup is on.
5. Report: detected stack, tables, gaps, rough effort per phase, risks, and a go / no-go recommendation. Wait for user approval.

## 2. Requirements (from the assignment) mapped to features

| Requirement | Implementation |
|---|---|
| Professional landing page with at least one image | Hero section with a real image (user-supplied or free-license, stored locally in `/public` or Supabase Storage; not hotlinked), `alt` text, nav, short value prop, footer |
| Login with `user_email` and `user_password` | Form fields named/IDed `user_email` and `user_password`; Supabase Auth email+password |
| After login, show "Maintain Users" and "Maintain Records" buttons | Hidden until authenticated admin session is unlocked (section 4) |
| Maintain Records: Create / Read / Update / Delete | Generic CRUD component (section 6) |
| Multiple tables, each with a hidden maintain button shown after login | "Maintain Records" reveals one button per table, e.g. "Maintain Study Spots", "Maintain Buildings" |
| Maintain Users table | Admin users page backed by an Edge Function (section 5) |
| Logout removes cookies and hides buttons | Logout flow in section 4.4 |

Note on the users table: the rubric likely expects a users table with `user_email`/`user_password`. We use Supabase Auth (passwords are hashed in `auth.users`, never stored or displayed in plaintext) and mirror users into `public.users` for display and the Maintain Users page. Passwords are never shown; admins can only set a new one.

## 3. Landing page

- Single clean page: nav (logo, Login), hero with image + headline + CTA, 3-feature strip, footer.
- Dark, modern theme with blue accents; judge fonts/density for this project.
- Responsive (mobile first). Semantic HTML, alt text, visible focus states, contrast AA.
- Login opens as a modal or `/login` route. Show errors inline (invalid credentials, locked out).

## 4. Auth and admin gating

### 4.1 Accounts
- Public signup disabled (Supabase dashboard > Auth settings). Admin accounts are created or invited from the dashboard or the Maintain Users page.
- "Confirm email" enabled so new accounts must confirm via emailed link.
- Admin role lives in `app_metadata.role = 'admin'` (not `user_metadata`; users can edit that themselves). Set only via dashboard/service role.
- Optional stretch: per-login email OTP via `signInWithOtp`. Skip unless time allows; not required by the rubric.

### 4.2 Login flow
1. User submits `user_email` + `user_password` via `signInWithPassword`.
2. Client reads `app_metadata.role`. If not `admin`, treat as a normal logged-in user: no admin buttons.
3. If admin, prompt for the personal admin code. Call `supabase.rpc('unlock_admin', { code })`.
4. On `true`, reveal "Maintain Users" and "Maintain Records". On `false`, show an error. Five failures lock the account for 15 minutes (server-enforced).
5. Hiding UI is UX only. The database enforces the gate (4.3).

Heads-up for demo/grading: whoever tests the site must use an admin account with a code set, otherwise they will see no buttons. Prepare and document a demo admin account.

### 4.3 Database enforcement (draft SQL, UNTESTED — review before applying)

```sql
create extension if not exists pgcrypto with schema extensions;

create table public.admin_codes (
  user_id uuid primary key references auth.users on delete cascade,
  code_hash text not null,
  failed int not null default 0,
  locked_until timestamptz
);
create table public.admin_sessions (
  user_id uuid primary key references auth.users on delete cascade,
  expires_at timestamptz not null
);
alter table public.admin_codes enable row level security;
alter table public.admin_sessions enable row level security;

create function public.is_admin_unlocked() returns boolean
language sql stable security definer set search_path = '' as $$
  select (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and exists (select 1 from public.admin_sessions
                where user_id = auth.uid() and expires_at > now());
$$;

create function public.unlock_admin(code text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare r public.admin_codes;
begin
  select * into r from public.admin_codes where user_id = auth.uid();
  if not found or (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin'
     or r.locked_until > now() then
    return false;
  end if;
  if r.code_hash = extensions.crypt(code, r.code_hash) then
    update public.admin_codes set failed = 0, locked_until = null where user_id = r.user_id;
    insert into public.admin_sessions values (r.user_id, now() + interval '2 hours')
      on conflict (user_id) do update set expires_at = excluded.expires_at;
    return true;
  end if;
  update public.admin_codes set
    failed = case when failed + 1 >= 5 then 0 else failed + 1 end,
    locked_until = case when failed + 1 >= 5 then now() + interval '15 minutes' else locked_until end
  where user_id = r.user_id;
  return false;
end $$;

create function public.lock_admin() returns void
language sql security definer set search_path = '' as $$
  delete from public.admin_sessions where user_id = auth.uid();
$$;

revoke execute on function public.unlock_admin(text), public.is_admin_unlocked(), public.lock_admin()
  from public, anon;
grant execute on function public.unlock_admin(text), public.is_admin_unlocked(), public.lock_admin()
  to authenticated;
```

- `admin_codes` and `admin_sessions` have RLS on and zero policies: clients cannot touch them.
- For every maintained table, keep a public `select` policy as the app needs, and add:
  `create policy "admin writes" on public.<table> for all to authenticated using (public.is_admin_unlocked()) with check (public.is_admin_unlocked());`
- Setting a code (user runs this manually in the SQL editor; never commit real codes):
  `insert into public.admin_codes (user_id, code_hash) values ('<uuid>', extensions.crypt('<code>', extensions.gen_salt('bf'))) on conflict (user_id) do update set code_hash = excluded.code_hash;`

### 4.4 Sessions, cookies, logout
- The rubric says logout removes cookies. Supabase JS defaults to localStorage, so use cookie-based session storage: `@supabase/ssr` if the framework has a server (Next.js/SvelteKit/Remix), otherwise a custom storage adapter backed by `document.cookie` (Secure, SameSite=Lax). Pure-SPA cookies cannot be HttpOnly; note this limitation.
- Logout: call `rpc('lock_admin')`, then `supabase.auth.signOut()`, then explicitly delete the auth cookies and clear any in-memory state, then hide all admin buttons and route to the landing page. Verify in devtools that the cookies are gone.
- Session restore on refresh: re-check `getUser()` and `is_admin_unlocked`; if either fails, show only the landing page.

## 5. Maintain Users

- Table `public.users`: `id` (FK to `auth.users`), `user_email`, `role`, `created_at`. Mirrored via an insert trigger on `auth.users` (security definer, `set search_path = ''`). RLS: select only when `is_admin_unlocked()`; no direct client writes.
- Real role source of truth is `app_metadata`; the mirrored column is display only. Updating a role must update both, inside the Edge Function, to avoid drift.
- Edge Function `admin-users` (actions: list, create/invite, update, delete):
  1. Build a client with the caller's JWT, call `rpc('is_admin_unlocked')`. If not true, return 403.
  2. Only then use a service-role client (key from Edge Function secrets) for `auth.admin.listUsers / createUser / inviteUserByEmail / updateUserById / deleteUser`.
  3. Guards: cannot delete or demote yourself; cannot remove the last admin; validate email format.
- UI: table of users (email, role, confirmed, last sign-in, created), search, Add user, Edit (email, role, reset password, disable), Delete with confirmation modal. Optimistic update with rollback on error.

## 6. Maintain Records (generic CRUD)

Build one reusable component driven by a per-table config so adding a table is a config entry, not a new page:

```ts
{ table: 'study_spots', label: 'Study Spots', pk: 'id',
  columns: [{ key:'name', type:'text', required:true }, { key:'building_id', type:'fk', ref:'buildings', display:'name' },
            { key:'floor', type:'int' }, { key:'amenities', type:'text[]' }, { key:'lat', type:'number' }, { key:'lng', type:'number' }] }
```

- Read: sortable, filterable, paginated table via supabase-js.
- Create / Update: modal form generated from config; field types render the right input; FK fields render dropdowns; client-side validation plus DB constraints as the real check.
- Delete: confirmation modal; consider a soft-delete flag (`deleted_at`) for spots.
- "Maintain Records" button reveals a button per configured table (e.g. Maintain Study Spots, Maintain Buildings). These stay hidden until the admin session is unlocked.
- Show loading, empty, and error states. Surface RLS rejections as a readable "not authorized — re-enter admin code" message.

Suggested schema (adapt to what Phase 0 finds; do not duplicate existing tables):
- `buildings(id, name, lat, lng)`
- `study_spots(id, building_id fk, floor, name, description, amenities, lat, lng, photo_url, created_by, created_at, deleted_at)`
- Use plain `double precision` lat/lng; use PostGIS `geography(Point,4326)` only if nearest-spot queries are needed.

## 7. Drop-a-pin feature (inside Maintain Study Spots)

- Map: Leaflet (`react-leaflet` if React) with satellite tiles (e.g. Esri World Imagery) toggle plus OSM. Verify current tile terms/attribution before shipping.
- Behavior:
  - Click on map drops a draggable temp marker and fills the form's `lat`/`lng`; dragging updates them live. Fields stay editable for manual correction.
  - Block placement below zoom 17 with a "zoom in to place a precise pin" hint. Ground resolution is about 0.23 m/px at zoom 19 around Provo (computed from the Web Mercator formula).
  - Validate coordinates against a BYU/Provo bounding box and reject outside it.
  - Existing spots render as markers; clicking one opens the edit form; dragging a marker offers "save new position".
  - Group several spots in one building via `building_id` + `floor`; the pin locates the building/entrance, floor and description distinguish rooms. Use marker clustering or a building-level pin to avoid overlapping markers.
  - Mobile: large tap targets, drag handle, coordinates shown.
- Optional AI-assist (Phase 4, stretch): admin uploads a spot photo; an Edge Function calls a vision model to suggest attributes (amenities, noise, seating). The model must NOT supply coordinates; location always comes from the human pin. Store photos in Supabase Storage (private bucket, admin-only write).
- Known limits to state in the UI/docs: imagery vs. basemap offset of a few meters (inference, unverified for BYU); no indoor positioning; 2D only.

## 8. Phases and acceptance criteria

1. **Phase 0** — discovery report (section 1). Gate.
2. **Phase 1** — Landing page, email/password login, cookie sessions, logout, role gating UI. Acceptance: image visible; wrong password shows error; admin buttons absent before login and after logout; cookies cleared on logout.
3. **Phase 2** — SQL from 4.3 (after approval), admin code unlock, generic CRUD for all tables. Acceptance: full create/read/update/delete on each table as unlocked admin; same calls rejected by the database when not admin, not unlocked, or after expiry; five wrong codes triggers lockout.
4. **Phase 3** — Maintain Users via Edge Function; pin-drop map. Acceptance: users listable/editable/deletable with self-delete and last-admin guards; non-admin JWT gets 403 from the function; pin click fills lat/lng; drag updates; placement blocked below zoom 17.
5. **Phase 4 (optional)** — AI photo assist, soft delete/audit log, PostGIS, Storage uploads.

## 9. Test plan

- Auth matrix: anon, normal user, admin locked, admin unlocked, admin expired. For each, confirm UI visibility and that direct supabase-js calls to every maintained table succeed or fail as expected.
- Call the Edge Function directly with each identity.
- Confirm the service-role key is absent from the built bundle (`grep` the build output).
- Run `get_advisors` (security) after migrations; fix any missing-RLS warnings.
- Manual: mobile viewport, keyboard navigation, refresh while logged in, logout then back-button.

## 10. Known risks and open items

- Rubric may expect every logged-in user to see the buttons; our design shows them to unlocked admins only. Confirm with the assignment grader/instructor or ensure the demo account is an admin.
- Pure-SPA hosting cannot set HttpOnly cookies; decide in Phase 0 whether a server layer exists.
- Static code is a single shared secret per admin (accepted by the user for this low-risk academic project: data is names and emails only). It is hashed, rate-limited, and checked by the database.
- All SQL here is untested drafts.
