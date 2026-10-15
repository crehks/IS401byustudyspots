# Connect your existing tables

Use this guide instead of the older lowercase-table setup. Table names are case-sensitive, including the space in `Study Spot`.

1. Keep all six existing tables: `Buildings`, `Floors`, `SpotType`, `Study Spot`, `User`, `ReportSpotStatus`. The live Study Spot table has no spot_name: labels remain in the frontend; spot_location is seeded in the database.
2. In the matching Supabase project's SQL Editor, paste the entire `supabase/SETUP_PRESERVE_EXISTING.sql` file and run it once. Existing spots 3 and 4 and parent rows are preserved. ReportSpotStatus must still be empty. All new sample spots, buildings, floors, types, and users use IDs 1001+. A conflict in those reserved IDs or existing RLS policies stops the transaction rather than being overwritten. Your existing demo user 1 and latest-report view are preserved/supported. If it reports an error, stop and share that error; do not reset anything.
3. The script adds sample rows so Buildings has at least 3, Floors at least 11, SpotType at least 3, Study Spot at least 27, User at least 3, and ReportSpotStatus 3. Sample data is fictional. Foreign keys connect these six ERD entities; East/West drawing views share the same physical floor ID.
4. Keep your URL and publishable key in `.env`. Change only its table line to `SUPABASE_REPORTS_TABLE=ReportSpotStatus`. Preserve the exact capitalization. Do not change `.env.example` or enter keys in the page.
5. Run `npm run check:db`, then `npm start`. Refresh the website. Use an alternate PORT if needed, as described in README.
6. Select WSC / Floor 1 / East / East hall tables (sample), then Choose this spot. Set noise and crowding, add a fictional note, and Confirm report.
7. Check Latest report, then refresh the full page and select the same spot again. The note and report ID must remain. In Table Editor, check that ReportSpotStatus contains that same report_id.

## How the button links up

The app uses sample Study Spot IDs 1001 through 1025 in the same order as the supplied seed; East hall tables is spot_id 1008. Its floor_id is 1004, linked to WSC building_id 1002. Do not change these seed IDs without updating the adapter. Local suggestions are not part of the cloud slice.

Confirm report POSTs to ReportSpotStatus with numeric spot_id, noise_level, crowd_level, and notes. Low=1, Medium=2, High=3. PostgreSQL generates report_id and created_at, and assigns fictional user_id 1001 through a database default. Protected ID/user/time fields cannot be set by the public client. The returned row is translated into readable labels for the UI.

On refresh the app reads latest_report_spot_status, a security-invoker view returning the newest row per spot. Public reports are readable; only the report action can insert, with no update/delete or public reading of User. This is a public classroom demonstration, not authentication or a production deployment. Never submit personal information.

Do NOT run SETUP_EXISTING_TABLES.sql, SETUP_REPORT_SLICE.sql, or the older migration/seed files for this schema. Those describe earlier schemas and remain only for compatibility/testing. Reserved, resources, and favorites tables are untouched and outside this vertical slice.
