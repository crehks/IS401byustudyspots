# Dev page (test branch: dev-page-implementation)

Admin area at `/admin.html`: landing page, login, admin-code unlock, Maintain Users, Maintain Records (CRUD) and a map pin-drop.
Nothing here touches the live Supabase project. Do not merge or apply the SQL without team approval.

## Run it
1. `npm run dev:backend` (local PGlite stand-in for Supabase, port 54321, resets on restart).
2. `npm start`, then open http://127.0.0.1:3000/admin.html.
3. Demo accounts and the admin code are in `tools/dev/seed.sql` (fabricated, local only).
4. `npm run test:admin` runs the auth-matrix tests against the real migration SQL.

## Files
- `admin.html`, `admin.css`, `admin.js`, `admin-config.js`: the page (config points at the local backend).
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
