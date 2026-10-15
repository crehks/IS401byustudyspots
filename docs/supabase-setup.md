# Supabase walkthrough: Confirm report

## What we are building

One existing action: **Choose this spot → Confirm report**. A student reports noise/crowding and notes for an existing study spot. The button sends a POST to Supabase, PostgreSQL inserts a row, the returned row appears in the UI, and clicking the spot shows its **Latest report**. A full refresh reads that latest report from the database again.

Six entities from your supplied ERD are implemented, not the whole future application. Favorites, resources, reservations, submissions, and account/login workflows are not newly database-enabled. The existing local preview features remain available. Your original image is included unchanged in the README.

## 1. Understand the tables and their links

| Table | Columns from your ERD | What it does |
| --- | --- | --- |
| `buildings` | `building_id` PK, `location`, `building_opens`, `building_closes` | Three sample campus buildings; hours are illustrative, not verified |
| `floors` | `floor_id` + `building_id` composite PK; `building_id` FK; `floor_number` | Eleven physical floors belonging to the buildings |
| `spot_types` | `type_id` PK, `description` | Three sample classifications: solo, group, solo-private |
| `study_spots` | `spot_id` PK; `spot_type_id`, `building_id`, `floor_id` FKs; `spot_name`, `outlets`, `capacity`, `location`, `reservable`, `seat_type` | The 25 built-in frontend study locations |
| `users` | `user_id` PK, `first_name`, `last_name` | Three fictional sample students; no passwords or real accounts |
| `user_reports` | `report_id` PK; `spot_id`, `user_id` FKs; `noise_level`, `crowd_levels`, `notes`, `time_reported` | The records inserted by Confirm report |

Relationship labels: Buildings **contains** Floors; Buildings/Floors **contains** Study spots; Spot type **classifies** Study spots; Study spot **receives** User reports; User **submits** User reports. Each report references exactly one spot and one user.

Implementation interpretations are explicit:

- Database identifiers use lowercase snake_case, while the supplied image retains its original labels.
- FloorID + BuildingID is the composite primary key shown by the diagram's PK markings. A study spot's paired foreign key guarantees its floor belongs to its building.
- FloorNumber is an integer attribute with uniqueness within a building. Its FK marking has no target in the supplied diagram, so no invented foreign key is added.
- WSC East/West are two map views of one physical floor. Both Floor 1 East and Floor 1 West spots reference `WSC-1`, for example. HBLL and JKB floor IDs follow the current app catalogue.
- The ERD's CrowdLevels maps to `crowd_levels`; the frontend's internal `busy` value maps to that column. NoiseLevel → `noise_level`, Notes → `notes`, TimeReported → `time_reported`.
- SQL text IDs retain the existing frontend spot/building identifiers. UUIDs are used for users/reports. Values, required fields, defaults, and constraints are implementation choices where the ERD does not specify types.
- The other diagram entities are future scope. The six implemented tables exceed the assignment's minimum of four without building those features.

A separate **view**, `latest_spot_reports`, selects exactly the newest report per spot using its timestamp and then UUID as a tie-breaker. It is not a seventh ERD entity or separate copied storage. Its `security_invoker` setting preserves underlying report permissions. Reading this view avoids an active spot's many reports hiding another spot's latest report.

## 2. Create one shared development Supabase project

Choose one teammate to create the project and invite teammates normally. Keep the database password in your password manager; this website never asks for it. Use fictional data only and do not put real student details into this classroom demo.

Use a fresh development project, or confirm none of the six table names already exist. The migration deliberately fails on a name collision rather than overwriting data. If it says a table already exists, first determine whether this exact migration was already applied; use `verify.sql` to inspect it. Do not drop existing tables to make an error disappear. The legacy `study_reports_demo` table, if present, is left untouched and not used.

## 3. Run the SQL files in this order

Open each file in VS Code. In Supabase choose **SQL Editor → New query**, paste the entire file, and run it:

1. **Schema — once:** `supabase/migrations/20261008_001_report_slice.sql`. This creates tables in parent-before-child order, foreign keys, indexes, RLS, the read policies, limited INSERT, and the latest-report view in a transaction.
2. **Sample data:** `supabase/seed.sql`. This inserts parent rows before their dependent rows. Stable keys and `on conflict do nothing` make repeated seeds safe; existing reports are not reset.
3. **Checks:** `supabase/verify.sql`. Expect the following initial counts:

| Table | Rows on a fresh seed |
| --- | ---: |
| buildings | 3 |
| floors | 11 |
| spot_types | 3 |
| study_spots | 25 |
| users | 3 |
| user_reports | 3 |

Later reports increase the final count. Every table has at least a few rows, and every RLS flag must be true. The joined verification query shows which report belongs to which spot, building, floor, and fictional user.

In **Table Editor**, inspect those six tables and their foreign keys. Admin SQL Editor results alone are not permission tests: the administrator bypasses RLS. The connected frontend and the test suite exercise restricted roles.

## 4. Know the classroom permissions

We are intentionally using one **fictional demo identity**, not creating login. PostgreSQL supplies `00000000-0000-4000-8000-000000000001` as the new report's UserID; the browser does not submit that field.

- Public clients can read the sample catalogue and reports.
- They can only insert `spot_id`, `noise_level`, `crowd_levels`, and `notes` into `user_reports`.
- They cannot choose report IDs, user IDs, or timestamps; update/delete existing rows; change catalogue rows; or read the users table.
- The INSERT policy permits only the fictional demo user and a known non-reservable spot. Foreign keys, level checks, and the 240-character note limit are enforced by PostgreSQL.
- RLS is enabled on all six tables. Both grants and policies are needed, as described in [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

Public report insertion still allows spam and does not establish a real user's identity. This is a development/classroom model, not production security. Authentication, ownership, moderation, rate limiting, and real private data are outside this one-button assignment.

## 5. Connect through .env in VS Code

1. Open the study-byu folder in VS Code, use Node.js 22 or newer, and start with npm start.
2. In the same Supabase project, copy the base project URL from Connect and an sb_publishable_ key from Settings → API Keys.
3. Copy the blank .env.example to a new .env beside package.json. Fill SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_REPORTS_TABLE=user_reports. Save .env.
4. Refresh the website. Settings are read only from .env; there is no in-page setup form or settings-write endpoint.
5. After the check finishes, a working connection has no banner. Missing settings, invalid settings, or a failed database request shows only **Supabase is not connected.**

Never put actual values in the shared .env.example, JavaScript files, GitHub, or screenshots. Never use a secret/service-role key, database password, or legacy JWT. The local server only exposes the required public configuration, not the .env file itself or unrelated variables. Supabase settings from process environment variables are not used. PORT can still be set in the terminal.

Use npm start, not a static Go Live preview. The helper binds only to loopback. Refresh after editing .env to read changes. The next step verifies an INSERT separately from the initial SELECT.

## 6. Verify the button and refresh

Clear filters, then choose **WSC → Floor 1 → East → East hall tables (sample)**. Click **Choose this spot**, select High noise and High crowding, and enter **Refresh proof 42**. Click **Confirm report** once.

The exact request is POST `<project-url>/rest/v1/user_reports`, with the publishable `apikey` and `Prefer: return=representation`. Payload fields are `spot_id`, `noise_level`, `crowd_levels`, and `notes`. The database generates ReportID/UserID/TimeReported and returns the saved row. The UI displays that returned row, not an assumed success.

Click **View this spot** or select it again. Its **Latest report** must show High/High, the same note, **Read from Supabase**, the same report ID, and its timestamp. Refresh the whole browser page, reopen the same spot, and confirm those values remain. Startup reads the view from Supabase again. No database reports are persisted to localStorage, and preexisting local reports for built-in spots are ignored while configured.

Find the same `report_id` in **Supabase Table Editor → user_reports**. A fresh browser session or a teammate's connected copy should also read it. Submitting a second report should replace the first in Latest report while both remain in the reports table.

Saved lists, filters, and locally suggested spots remain local. Reports on new local suggestions explicitly stay local too; they are not this database test. Use one of the 25 seeded built-in spots for the video.

## 7. Troubleshooting and team handoff

| Symptom | Check |
| --- | --- |
| Supabase is not connected | Use npm start, edit .env, and refresh |
| Missing table/view | Run the migration once and seed.sql; confirm project and public schema |
| Foreign-key error | Seed the catalogue and the demo user in the same project |
| Wrong columns / old demo table | Set Reports table to user_reports; use the new ERD migration |
| 401 key error | Copy an sb_publishable_ key from the matching project's API Keys |
| 403 permission error | Check SELECT/column INSERT grants and RLS policies; do not disable RLS |
| Refresh shows old sample | Verify the disconnected warning is absent after loading, choose the same spot, and inspect matching report_id |
| Port already used | Stop the old local copy or choose a different PORT |
| Settings unavailable | Check the local .env for typos and refresh |

The failure stays visible in the form; built-in spot saves never fall back silently to local storage. A timeout may occur after a server accepted an insert, so inspect the table/refresh before retrying to avoid an unnecessary second report.

Commit the app, supplied ERD image, migration, seed, and README to one shared main version. Never commit `.env`. Teammates start from that version rather than independently creating tables. The included offline integration test validates PostgreSQL SQL/RLS and frontend handler behavior, but your own hosted project, browser presentation, and final refresh/video test must still be checked.

References: [Data REST API](https://supabase.com/docs/guides/api), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [API keys](https://supabase.com/docs/guides/getting-started/api-keys).
