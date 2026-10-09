# Verification scope for this delivery

Automated checks use fictional data and local fixtures, not a connected cloud project.

- Twelve dependency-free tests check public-only configuration, rejected settings writes, .env file protection, numeric and legacy report values, correct 401/42501 permission errors, refresh request behavior, seed coverage, maps, and the supplied ERD embed.
- An additional PostgreSQL fixture matches the live information_schema output: Buildings, SpotType, no spot_name, an existing demo user 1, and an existing latest-report view. The corrected SETUP_PRESERVE_EXISTING.sql passes sample counts, protected defaults, public-role inserts, persistence, and forbidden writes without touching a hosted project.
- The existing-schema PostgreSQL fixture matches the six supplied column screenshots. It verifies the complete existing-table setup, sample counts, identity IDs, numeric levels, foreign keys, both public roles, latest-report persistence, forbidden writes, and safe refusal to reseed tables that contain data. No cloud changes were made; hosted verification still requires running the setup in the team's project.
- The offline integration test executes the actual migration and seed in PostgreSQL. It checks all six initial row counts, seed repeatability, building/floor foreign keys, RLS and grants for anon/authenticated, protected user/ID/time fields, forbidden writes, and latest-per-spot behavior with 1,100 additional reports.
- The same test drives actual frontend handlers for filters, maps, room search, zoom/pan, local favorites/lists/suggestions, read-only .env configuration, report submission, duplicate-submit protection, returned-row display, failure handling, escaped notes, and a fresh frontend reload with empty browser storage.
- The original ERD PNG is copied unchanged. All nine vector floor maps remain present with 1,001 searchable room/area identifiers.

These are not screenshot/pixel-layout tests. The browser automation helper was unavailable in this session, so a rendered desktop/mobile browser check has not been completed. Read-only checks of the configured hosted project found valid local URL/key settings but HTTP 404 / PGRST205 for both user_reports and latest_spot_reports. The API cannot find these objects. No hosted schema or data was modified. Run the provided SQL setup in the matching development project before verifying live report writes and refresh persistence. The video and public GitHub access also remain team steps.

Run npm test for the small checks. Run npm ci followed by npm run test:integration for the SQL/frontend fixtures. None of these test scripts read or modify your actual .env or hosted project.

The preserving-schema fixture starts with the exact two existing reserved spots (3 and 4), an existing building/floor/type/user, and the latest-report view. It verifies unchanged existing rows, 25 additional sample spots at IDs 1001–1025, protected demo user 1001, and the actual database adapter inserting into PostgreSQL and reloading the same report ID/note in a fresh client. Hosted setup is still a user step.
