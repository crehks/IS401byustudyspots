# Study BYU team file guide

Start here when finding code or deciding which file to edit. Source comments use short section labels and explain the decisions that are easy to miss.

## Main files

| File | Responsibility | Edit here for |
| --- | --- | --- |
| `index.html` | Page structure, three views, shared dialog/toast hosts, and stable element IDs | Visible page sections, form labels, and navigation markup |
| `styles.css` | Theme, layout, controls, maps, responsive rules, and focus states | Colors, spacing, sizes, mobile layout, and visual states |
| `app.js` | Catalogue, filters, rendering, navigation, local storage, and event handlers | App interactions, spot content, campus footprints, and provisional pins |
| `database.js` | Supabase configuration, report reads/inserts, and response validation | Database column mapping, API errors, and report persistence |
| `server.mjs` | Local HTTP server and validated browser-safe configuration | Local file serving, allowed public files, and connection-setting checks |
| `wsc-plans.js`, `hbll-plans.js`, `jkb-plans.js` | Generated SVG drawings and searchable room metadata | Inspect floor data; use the generator for geometry changes |
| `package.json` | Commands, Node version, and development dependencies | Available scripts and dependency declarations |
| `package-lock.json` | Exact dependency versions | Let npm update this file when dependencies change |
| `.env.example` | Blank connection-setting template | Setting names and explanatory comments |
| `.gitignore` | Files excluded from Git | Local settings, dependencies, logs, and generated test/build output |
| `IS 403.code-workspace` | Editor workspace settings | VS Code workspace configuration |

The local `.env` holds the project's actual connection settings. The server reads it; the browser receives only the validated public URL, publishable key, table name, and configured flag through `/api/config`.

## Find your place in app.js

Search for these numbered section comments:

1. **Building catalogue** — supported buildings, drawing keys, and sample spots.
2. **Saved device data** — load/recover stored lists, suggestions, reports, and filters; page state and pin positions follow.
3. **Campus map** — footprint labels, native SVG, zoom, dragging, and building actions.
4. **Shared helpers** — local saves, spot lookup, report selection, filtering, and ranking.
5. **Reporting** — connection status, database receipt, submission, and errors.
6. **Views** — filters, recommendations, building/results panels, saved lists, and navigation.
7. **Floor tools** — fit, zoom, pan, room search, and room highlighting.
8. **Dialogs** — shared focus handling, spot details, arrival reports, save choices, suggestions, and new lists.
9. **Event routing** — click, change, keyboard, and submit handlers. `data-*` attributes identify the action.
10. **Startup** — render local content, then refresh after the database connection check.

`data` is what can be saved on this device. `state` is the current screen/filter selection. `database` holds the remote connection state and loaded reports. Use `esc()` for user text inserted into HTML templates.

## Styles and markup

`styles.css` runs from shared styles to specific refinements. Its seven labeled sections cover theme, shared components, responsive defaults, campus SVG, floor controls, native floor SVG, and final refinements. Later rules can override earlier rules; keep that order when editing.

`index.html` labels the **Explore**, **Building**, and **Saved** views. Empty containers such as `floorPlan`, `spotList`, and `savedItems` are filled by `app.js`. Keep element IDs and `data-*` hooks aligned with the event handlers.

The shared modal makes `.app-shell` inert while open. Its keyboard handler keeps Tab inside and returns focus when closed. Use the existing modal helpers for any changes to these flows.

## Maps and stable IDs

| Data | Where it lives | Meaning |
| --- | --- | --- |
| Campus footprints | `CAMPUS_BUILDINGS` in `app.js` | Points from the supplied campus reference; only HBLL, WSC, and JKB open floor maps |
| Building/drawing choices | `BUILDINGS` in `app.js` | A drawing key can identify one side of a physical floor |
| Sample study spots | `DEMO_SPOTS` in `app.js` | IDs shared with the adapter and SQL fixtures; placements remain provisional |
| Floor pin positions | `WILK_STUDY_POINTS`, `HBLL_STUDY_POINTS`, `JKB_STUDY_POINTS` | Original PDF page coordinates; rendering subtracts the drawing's crop offset |
| Room search | `rooms` in each plan bundle | Room number and position inside the cropped drawing |
| Display geometry | `svg` in each plan bundle | Walls, spaces, labels, notes, and selectable room controls |
| Original drawings | `assets/<building>/*.pdf` | Source PDFs linked by the app |
| Exported maps/audits | `assets/<building>/digital/` | Standalone SVGs and `digitization-audit.json` from the generator |

Keep JKB's `G` drawing key: the UI displays it as Floor 1, while existing spot references use `G`. WSC East/West and HBLL North/South are drawing views, not separate database floors.

The `numericSpotIds` array in `database.js` maps each frontend spot ID to array position plus **1001**. Reordering it changes which database spot receives a report. Noise/crowding map to **1 low, 2 medium, 3 high**.

Plan bundles are generated data. Their headers explain the fields, and each floor starts on a separate line. The payload after the assignment remains valid JSON so the generator can read it during a partial rebuild. Regeneration replaces the bundle, including its comments.

## What persists where

| Information | Storage |
| --- | --- |
| Built-in, non-reservable spot reports with Supabase configured | Supabase; a failed insert remains an error |
| Report row shown in a successful database receipt | The actual row returned by Supabase |
| Favorites, custom lists, saved filters, and suggested spots | Browser local storage on this device |
| Reports for custom suggestions, or unconfigured local preview reports | Browser local storage |
| Active floor, selected room, current zoom, and unsaved filter choices | Page memory; reset on refresh |

Reservation links open BYU's external service. This app does not create reservations. Room geometry and sample study pins are separate layers.

## SQL files: choose by schema

These files document different setup stages. They are not a sequence to run against the same database. The team's current project uses **`ReportSpotStatus`** with the existing numeric schema; normal development starts the app without rerunning setup SQL.

| File | Role |
| --- | --- |
| `supabase/SETUP_PRESERVE_EXISTING.sql` | One-time variant that preserves existing inventory and adds sample IDs 1001+; its guards require no existing reports or conflicting sample IDs |
| `supabase/SETUP_ACTUAL_SCHEMA.sql` | Earlier confirmed-schema variant requiring empty study spots and reports; retains parent rows |
| `supabase/SETUP_EXISTING_TABLES.sql` | Earlier empty-table variant using `Building` and `SpotTypeTable` names |
| `supabase/migrations/20261008_001_report_slice.sql` | Fresh development schema with lowercase tables and text IDs |
| `supabase/seed.sql` | Fictional sample rows for that lowercase schema |
| `supabase/verify.sql` | Read-only queries for that lowercase schema |
| `supabase/SETUP_REPORT_SLICE.sql` | Combined copy of the lowercase migration, seed, and verification |
| `supabase/bootstrap-vertical-slice.sql` | Historical one-table smoke test; unused by the current adapter |

SQL comments label checks, sample data, relationships, defaults, grants, policies, and latest-report views. If editing the lowercase migration or seed, keep their copies in `SETUP_REPORT_SLICE.sql` synchronized; the integration test checks this.

## Tools and tests

| File or command | Purpose |
| --- | --- |
| `npm start` | Run `server.mjs`; default address is `http://127.0.0.1:3000` |
| `npm run check:db` | Run the read-only connection check in `tools/check-database.mjs` |
| `npm test` | Run catalogue, adapter, server, and storage tests in `tests/` |
| `npm run test:integration` | Run all four isolated SQL/DOM fixtures in `tools/test-*.mjs` |
| `npm run package` | Run `tools/package.mjs`; update the same `StudyBYUProduct.zip` in the parent folder |
| `tools/digitize_wsc.py` | Convert supplied CAD PDFs into native SVGs, searchable bundles, and audit metadata; supports WSC, `--hbll`, and `--jkb` |
| `tools/render_map_previews.py` | Render the WSC SVGs as review PNGs outside the app folder |

The `test-integration.mjs` fixture covers the full app flow with temporary servers and PGlite PostgreSQL. The other three integration scripts cover earlier table names, the confirmed schema, and preservation of existing rows. They use fictional local data and do not read the real `.env`.

The Python tools require PyMuPDF, OpenCV, NumPy, and pypdf for digitization; the preview renderer uses PyMuPDF. They are development tools, not app startup requirements. Rebuilding maps overwrites generated output, so review the resulting drawings and room metadata together.

## Other documentation

- `README.md`: product summary, startup, ERD, and demo flow.
- `docs/CODEX_HANDOFF.md`: project history and decisions to preserve.
- `docs/audit-2026-10-27.md`: latest functionality/design audit and current connection limitation.
- `docs/verification.md`: detailed historical verification evidence.
- `docs/demo-checklist.md`: short demo preparation checklist.
- `docs/supabase-setup.md` and `docs/YOUR_EXISTING_TABLES.md`: schema/setup background.
- `docs/erd.png`: the supplied ERD image shown in the README.

For current connection status, use `npm run check:db`. Historical test results do not prove that the hosted project is reachable today.
