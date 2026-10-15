# Verification scope for this delivery

## Campus overview update — October 14, 2026

Replaced the schematic campus blocks with 45 traced SVG building footprints, courtyard/field/path/road context, labels, and illustrative raised edges. Only JKB, HBLL, and WSC open the existing floor-plan views; the other 42 show a dismissible coming-soon message. The feedback control from the source screenshot was not included.

All 45 building actions, the three supported routes, popover dismissal/keyboard activation, and independent campus zoom/reset passed the frontend fixture. Laptop and phone browser checks confirmed supported routes, the coming-soon message, controls, and no page-wide horizontal overflow. All 23 floor views, 25 spot actions, save/refresh tests, and all four SQL/frontend fixtures continue to pass. This update changes no database schema, inventory IDs, credentials, or hosted rows.

Sixteen unit tests now pass. The campus map retains the existing HTML/CSS/JS stack; no new runtime package or external map dependency was added.

## Release check — October 14, 2026

- Tested an extracted copy of `StudyBYUProduct.zip`, not just the development folder.
- Browser checks passed for all **23 native SVG floor views** at laptop (1366×900) and phone (390×844) sizes: WSC 9, HBLL 10, JKB 4. Each view displayed geometry and room labels without page-wide horizontal overflow.
- All 25 built-in spot actions passed automated frontend checks. Floor/side selection, building switching, room search/selection, clear selection, zoom/fit/pan, labels, filters, saved lists, suggestions, report validation, and refresh behavior passed the SQL/frontend fixtures. All 23 source PDFs and 23 SVG assets returned HTTP 200 with correct content types.
- Browser checks additionally verified saved filters, list creation and its limit, adding/removing a favorite, empty-state recovery, and a local suggestion/report surviving refresh. No browser console errors were recorded in the extracted app during these checks.
- Fixed long unbroken spot names that hid phone controls, and added an inline error for whitespace-only list names. The local `.env` report-table setting was corrected from `user_reports` to `ReportSpotStatus`; its URL and key were unchanged.
- **Live Supabase save and refresh passed:** one clearly labeled fictional QA report was inserted for WSC East hall tables (spot 1008), returned report ID **11**, and displayed that same ID/note after a full browser refresh. That test row remains in the database; no existing rows, schema, or security policies were changed.
- Fifteen unit checks and all four SQL/frontend fixture scripts passed. The ZIP contains the full folder structure and no `.env` or `node_modules`.

This confirms the tested prototype flows, not an unlimited production certification. The GitHub upload must still be replaced with this complete package. GitHub Pages cannot run the Node `.env` backend; database-enabled public hosting requires a Node-capable deployment. Favorites and new-spot suggestions are intentionally device-local, and inventory/status examples remain provisional.

## Earlier verification notes

Automated checks use fictional data and local fixtures, not a connected cloud project.

- Fifteen dependency-free tests check public-only configuration, rejected settings writes, .env file protection, numeric and legacy report values, correct 401/42501 permission errors, refresh request behavior, seed coverage, maps, and the supplied ERD embed.
- An additional PostgreSQL fixture matches the live information_schema output: Buildings, SpotType, no spot_name, an existing demo user 1, and an existing latest-report view. The corrected SETUP_PRESERVE_EXISTING.sql passes sample counts, protected defaults, public-role inserts, persistence, and forbidden writes without touching a hosted project.
- The existing-schema PostgreSQL fixture matches the six supplied column screenshots. It verifies the complete existing-table setup, sample counts, identity IDs, numeric levels, foreign keys, both public roles, latest-report persistence, forbidden writes, and safe refusal to reseed tables that contain data. No cloud changes were made; hosted verification still requires running the setup in the team's project.
- The offline integration test executes the actual migration and seed in PostgreSQL. It checks all six initial row counts, seed repeatability, building/floor foreign keys, RLS and grants for anon/authenticated, protected user/ID/time fields, forbidden writes, and latest-per-spot behavior with 1,100 additional reports.
- The same test drives actual frontend handlers for filters, maps, room search, zoom/pan, local favorites/lists/suggestions, read-only .env configuration, report submission, duplicate-submit protection, returned-row display, failure handling, escaped notes, and a fresh frontend reload with empty browser storage.
- The supplied ERD image is embedded in the README. All nine WSC vector maps remain present with 1,001 searchable room/area identifiers. HBLL adds ten native SVG views with 909 searchable identifiers across the drawings; all room labels match their source PDFs, and bundled PDFs match the supplied originals by SHA-256.
- HBLL checks cover all floors, North/South continuity, basement room 79A, cross-floor search for room 4732, keyboard selection, zoom/fit/pan, label visibility, source links, and isolation from WSC/JKB. The offline frontend test also saves an HBLL report and reads its exact ID/note in a fresh session.
- JKB adds four native SVG views with 405 searchable room identifiers. Original room labels and PDF hashes match all four supplied sheets. Tests cover floors 1–4, cross-floor search for room 4057, alphanumeric/keyboard search, zoom/fit/pan, label visibility, source links, sample-pin placement, and saving/reloading a JKB report in a fresh session. Floor 1 retains the legacy `G` catalogue key so existing demo spot IDs and database rows remain unchanged.

Each original HBLL/JKB PDF and each rendered, themed SVG was inspected visually, including close-ups of rooms 4732 and 4057. Publishing blocks and locator insets were excluded without removing the building geometry. Those earlier map checks were offline; the newer browser and live-save results are recorded above. The demo video and replacement GitHub upload remain team steps. Do not rerun seed scripts for this map update.

Run npm test for the small checks. Run npm ci followed by npm run test:integration for the SQL/frontend fixtures. None of these test scripts read or modify your actual .env or hosted project.

The preserving-schema fixture starts with the exact two existing reserved spots (3 and 4), an existing building/floor/type/user, and the latest-report view. It verifies unchanged existing rows, 25 additional sample spots at IDs 1001–1025, protected demo user 1001, and the actual database adapter inserting into PostgreSQL and reloading the same report ID/note in a fresh client. Hosted setup is still a user step.
