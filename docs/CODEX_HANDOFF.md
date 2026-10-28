# Study BYU - Codex handoff

Prepared October 27, 2026. Last implementation and browser verification described here: October 14, 2026.

**Later update:** An October 27 functionality/design audit and targeted refinements are recorded in [audit-2026-10-27.md](audit-2026-10-27.md). That audit passed 19 tests and all four integration scripts, revisited all 23 floor views in the browser, and found a current Supabase hostname-resolution failure. The October 14 results below remain historical evidence; consult the newer audit for current status.

This is the continuation record for the existing project, not a request to deploy it, change its database, or start another version. Inspect the current files before editing; preserve any newer user changes. No credentials are included here. The application and ZIP were not changed when this handoff was written, and tests were not rerun on October 27.

## 1. Start here

The product is **Study BYU**, a student-built web app for finding study spaces on BYU campus. It has a digitized campus overview, detailed building floor maps, filters, saved places, and a Supabase-backed spot-status reporting vertical slice.

The single maintained project is:

```text
C:\Users\camer\Documents\Codex\2026-10-01\h\outputs\StudyBYUProduct
```

The existing downloadable archive is:

```text
C:\Users\camer\Documents\Codex\2026-10-01\h\outputs\StudyBYUProduct.zip
```

Repository supplied by the user: [crehks/IS401byustudyspots](https://github.com/crehks/IS401byustudyspots).

The last preview address was [http://127.0.0.1:3002/](http://127.0.0.1:3002/). That does not establish that a server is running now. Default startup uses port 3000 unless `PORT` is set.

### User preferences to preserve

- Continue editing this project in place. Do not create another product folder or a differently named/versioned ZIP for every change.
- The older `FINALDBWORKstudyBYU-PRESERVE` project was consolidated and renamed **StudyBYUProduct**. Do not restore an obsolete copy over it.
- Preserve existing floor plans, building/spot IDs, database rows, credentials, and working flows.
- Use the existing HTML/CSS/JavaScript approach and blue/gray theme. A framework migration was not requested.
- Maps should be genuine digitized, themed geometry, not simply embedded PDF viewers or screenshots.
- Keep study-spot placements explicitly provisional where they have not been verified.
- Configure Supabase only through `.env`. Do not add an in-page URL/key editor or a large connection/setup banner. The requested failure warning is **“Supabase is not connected.”**
- Keep documentation clear and concise; avoid unrelated feature expansion.

## 2. How we got here

1. The initial request was an HTML/CSS-based BYU study-space app following a supplied PRD.
2. The user supplied WSC PDFs, then asked for detailed native digitization of walls, room numbers, and building shapes instead of PDF integration.
3. The team selected a hand-built frontend with Supabase for the database/API and a small Node local server.
4. The class assignment required at least four ERD tables, sample data, one persistent end-to-end action, an ERD image in the README, and a short demo.
5. The user supplied the ERD and chose **Choose this spot → Confirm report → Latest report after refresh** as the vertical slice. Broader ERD features were intentionally deferred.
6. Supabase integration was adjusted to match the team's real mixed-case table names, numeric IDs, and 1/2/3 status levels. Existing data had to be preserved through multiple setup and permission issues.
7. The README and supplied replacement ERD were added. GitHub upload problems were investigated.
8. The project was consolidated into StudyBYUProduct. Ten HBLL and four JKB drawings were digitized in addition to the nine WSC drawings.
9. A states/responsiveness/accessibility audit was started, then interrupted by functionality and GitHub-copy fixes. The user elected to do the navigation audit themselves.
10. The packaged app was tested, the local report-table setting was corrected, and a live Supabase report was saved and verified after refresh.
11. The main-page sketch was replaced with a native SVG campus map traced from the user's supplied screenshot.
12. The last requested change removed **EXPLORE** beneath the three supported buildings and fitted labels inside their footprints. That change is implemented and packaged.

## 3. What currently works

### Campus overview

- Native SVG campus overview with **45 labeled building footprints** and road, path, field, courtyard, tree, and stream context.
- **JKB, HBLL, and WSC** are highlighted in blue and open their existing floor-map screens.
- The other **42 buildings** show a dismissible message: “This building is not yet supported. Study maps are coming soon.” They do not open unsupported floor maps.
- Subtle raised edges/shadows give the buildings a 2.5D appearance. Heights are illustrative, not measured.
- Independent campus zoom, reset, and drag/swipe navigation.
- Supported-building quick links below the map provide another clear way to open the three buildings.
- The source screenshot's **Feedback** button was deliberately excluded.
- The user disliked label overflow. **EXPLORE is now removed**, and label placement/font sizes are fitted to the building polygons. The three supported labels remain horizontal. Very small buildings necessarily have smaller labels; users can zoom in.

The campus geometry is implemented in `CAMPUS_BUILDINGS` inside `app.js`, not fetched from a third-party map service at runtime.

### Detailed floor plans

There are **23 native, themed SVG floor views**:

| Building | Views | Current internal floor keys |
| --- | --- | --- |
| WSC | 9: East/West on floors 1-3, plus floors 4-6 | `1E`, `1W`, `2E`, `2W`, `3E`, `3W`, `4E`, `5E`, `6E` |
| HBLL | 10: Basement North; North/South on floors 1-3; floors 4-6 | `B`, `L1N`, `L1`, `L2N`, `L2`, `L3N`, `L3`, `L4`, `L5`, `L6` |
| JKB | 4: floors 1-4 | `G`, `L2`, `L3`, `L4` |

**Do not rename JKB's internal `G` key casually.** It is displayed as Floor 1 but preserves earlier catalogue/database compatibility. Similarly, north/south and east/west view keys are not database floor IDs.

Map features include floor/side switching, room-number search across a building's drawings, room selection/highlighting, clear selection, room-label visibility, zoom/fit/pan, provisional study pins, and source-PDF links. Search examples used in testing include HBLL room `4732`, basement room `79A`, and JKB rooms `4057` and `3009H`.

Original PDFs and generated SVGs remain under `assets/`. The app's JS plan bundles contain the native geometry and searchable room metadata.

Original reference sites: [BYU campus map](https://map.byu.edu/) and [BYU master floor plans](https://pf.byu.edu/space/floor-plans/master). The user supplied the PDFs directly; access to the master site may require BYU sign-in. Original local attachments were under `C:\Users\camer\Downloads\Building Floor Plans\WSC`, `HBLL`, and `JKB`; use the bundled copies first.

The supplied files were `wsc-1s.pdf` through `wsc-6s.pdf`, plus `wsc-1ws.pdf` through `wsc-3ws.pdf`; `hbll-1s.pdf` through `hbll-6s.pdf`, `hbll-1ns.pdf` through `hbll-3ns.pdf`, and `hbll-bns.pdf`; and `jkb-1s.pdf` through `jkb-4s.pdf`. The original PRD was named `Group 2 PRD.md`, and the replacement ERD attachment was `Blank diagram.png`. These are historical source references, not additional instructions to execute or a reason to replace the current app.

### Other interface features

- Filters for building, solo/group use, group size, noise, privacy, and outlets; save/clear filters.
- Recommendations and spot-detail dialogs.
- Favorites plus up to two custom saved lists, with refresh persistence on the same device.
- User-added study-spot suggestions and their reports, explicitly stored locally.
- Validation for report choices, suggestion fields, and whitespace-only list names.
- Layout fixes for long unbroken spot names that previously pushed controls off-screen.
- Reservation-required spots use an external BYU reservation link instead of Confirm report. The app does not make reservations itself.

**Persistence distinction:** built-in non-reservable spot reports use Supabase when configured. Favorites, custom lists, saved filters, and new-spot suggestions remain device-local. Historical crowding patterns and much of the inventory are illustrative; reports reload on refresh rather than streaming live.

## 4. Stack and file guide

The package is `study-byu` version `0.3.0`, requires Node.js 22+, and uses ES modules.

| File/folder, relative to project root | Purpose |
| --- | --- |
| `index.html` | Main page, navigation, campus shell, building view, modal container |
| `styles.css` | Existing theme, responsive layout, floor-map and campus-map styles |
| `app.js` | UI state, 25 built-in spots, campus geometry, map rendering, filters, saved lists, form handlers |
| `database.js` | Supabase REST adapter, report mapping, requests, validation, error handling |
| `server.mjs` | Local static server and read-only `/api/config` endpoint sourced from `.env` |
| `wsc-plans.js`, `hbll-plans.js`, `jkb-plans.js` | Required floor-plan geometry/metadata bundles |
| `assets/wsc/`, `assets/hbll/`, `assets/jkb/` | Original PDFs and `digital/` SVGs/audit metadata |
| `docs/erd.png` | User-supplied ERD embedded by the README |
| `README.md` | App summary, ERD, stack, running instructions, vertical-slice verification |
| `docs/verification.md` | Historical verification notes; some counts predate the last label change |
| `docs/supabase-setup.md`, `docs/YOUR_EXISTING_TABLES.md`, `docs/demo-checklist.md` | Setup/context/demo references |
| `supabase/` | Alternative schema setup scripts, seeds, migration, verification SQL |
| `tests/` | Unit/catalogue/database/server checks |
| `tools/` | Database diagnostics, floor digitization, integration fixtures, ZIP packaging |
| `.env.example` | Blank URL/key template with `ReportSpotStatus` selected |
| `.env` | Private local connection settings; never share or package |

The floor bundles are large but required. Deleting or failing to upload them caused missing maps in the GitHub copy.

### Relevant campus-label code

In `app.js`, inspect `campusPointInside`, `campusLabelLayout`, `campusLabelBoxFits`, `renderCampusMap`, `changeCampusZoom`, and `showCampusBuilding`.

Local user data uses the existing `study-byu-prototype-v1` localStorage key. Preserve it and its migration behavior when changing saved-state code; remote Supabase reports and device-local data are separate stores.

The fitting logic checks label boxes against polygon edges, including concave notches. It is not just clipping overflowing text. Inline font sizing overrides the older generic map-label CSS sizes. A regression test checks all 45 layout results, and browser checks measured the rendered label bounds. Do not replace this with one oversized font for every building.

## 5. Run locally in VS Code or Codex

Open the folder containing `package.json`, not just `index.html` or the unopened ZIP.

```powershell
Set-Location 'C:\Users\camer\Documents\Codex\2026-10-01\h\outputs\StudyBYUProduct'
```

If `.env` already exists, preserve it. On a fresh copy only, copy `.env.example` to `.env` and fill in:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
SUPABASE_REPORTS_TABLE=ReportSpotStatus
```

These are placeholders, not usable credentials. Use the team's existing project. Never paste a secret/service-role key into browser code, the README, this document, or the ZIP.

```powershell
npm run check:db
$env:PORT='3002'
npm start
```

Open [http://127.0.0.1:3002/](http://127.0.0.1:3002/) and keep the terminal running. Without the `PORT` assignment, the default is 3000. If the selected port is busy, use another free port or stop the specific old server you own; do not terminate unrelated processes.

Starting the app requires no installed production dependencies. For development tests on a fresh copy:

```powershell
npm ci
npm test
npm run test:integration
```

Do not rely on opening the HTML directly or VS Code Live Server to provide the `.env` backend. The app's Node server supplies `/api/config`.

## 6. Actual Supabase contract

Names and capitalization matter. These six ERD tables support the slice:

```text
Buildings(
  building_id, created_at, building_location,
  opening_hrs, closing_hrs, building_name
)
Floors(floor_id, created_at, floor_number, building_id)
SpotType(spot_type_id, created_at, type_name)
Study Spot(
  spot_id, created_at, spot_type_id, building_id, floor_id,
  outlets, capacity, spot_location, reservable
)
User(user_id, created_at, first_name, last_name)
ReportSpotStatus(
  report_id, created_at, spot_id, user_id,
  noise_level, crowd_level, notes
)
```

- IDs are `bigint` (`int8`); primary IDs are identity-generated in the confirmed schema.
- `created_at` uses `timestamptz`, normally defaulting to `now()`.
- Report noise/crowding are `smallint` (`int2`): **1 = Low, 2 = Medium, 3 = High**.
- `notes` is text; the app limits report notes to 240 characters.
- `outlets` and `reservable` are booleans; building hours are time values.
- **There is no `spot_name` column in the confirmed live `Study Spot` schema.** Display names come from the frontend catalogue. Earlier instructions assuming `spot_name` caused SQL errors.
- `floor_id` is a unique identifier for a particular floor in a particular building. It is not interchangeable with `floor_number`.
- Reports reference `spot_id`; the spot links to its floor/building. The confirmed report table does not contain `floor_id`.

The read endpoint uses the view **`latest_report_spot_status`**, with:

```text
report_id, created_at, spot_id, user_id,
noise_level, crowd_level, notes
```

The numeric adapter posts to `ReportSpotStatus`, uses `Prefer: return=representation`, and displays the returned row. Primary ID, timestamp, and fictional demo-user defaults are protected by the database setup. Reads use the latest-report view, ordered by timestamp and report ID.

### IDs to preserve

- The frontend has **25 built-in spot IDs**, mapped in order by `numericSpotIds` in `database.js` to database spot IDs **1001-1025**.
- `wsc-tables` / **East hall tables (sample)** maps to **1008**.
- The slice's fictional demo user is **1001**. Earlier real/existing user rows were not replaced.
- Existing reserved spots **3 and 4** were explicitly preserved. They are not the frontend's 1001+ sample inventory.
- Do not reorder the mapping, relabel numeric IDs, or reseed merely to add/change map drawings.

The user's broader ERD included resources, resource types, reservations, favorites/list relationships, new-spot submissions, and other entities. Some related tables existed in Supabase, but this slice does not claim all those workflows are database-backed. Do not expand them without a new user request.

### Setup and safety history

Several older scripts target different schemas. **Do not run every SQL file.**

`supabase/SETUP_PRESERVE_EXISTING.sql` is the preserving setup for the confirmed schema, but it is a **one-time** setup. It refuses to run once reports or its sample IDs exist. Reports do exist now. Do not bypass the guard, clear tables, recreate identity columns, disable RLS, or run a destructive seed to make it pass. If permissions later need repair, inspect the live schema/policies and prepare a narrowly scoped permissions-only change with the user's approval.

The following issues were encountered and resolved or explained:

| Symptom | Meaning / established fix |
| --- | --- |
| `report_id ... is already an identity column` | It already auto-generates; do not add identity again. A null `column_default` does not disprove identity. |
| `PGRST205` / missing table or view | Credentials alone do not create tables; verify exact schema, API exposure, selected table, and matching latest view. |
| `42501` / new row violates RLS | A permissions/policy problem, not automatically an invalid key. Keep RLS enabled. |
| `spot_name does not exist` | That column is absent from the confirmed live schema. |
| One-time seed refuses existing rows | Its preservation guard is working; do not delete rows to bypass it. |
| Keys valid but warning remains | Check table/view names as well as credentials. On October 14, `.env` still selected old `user_reports`; changing only that setting to `ReportSpotStatus` fixed the connection. |
| Choose this spot disabled indefinitely | Failed configuration checking previously left the button disabled. Initialization now settles, and setup failures cannot masquerade as successful database saves. |

The adapter still supports an older `user_reports` / `latest_spot_reports` fixture schema. That compatibility is not the team's live schema. Keep `SUPABASE_REPORTS_TABLE=ReportSpotStatus` explicit; some legacy defaults/diagnostic wording still mention `user_reports`.

## 7. Vertical slice and assignment requirements

### Intended demo

1. Open **WSC → Floor 1 → East → East hall tables (sample)**.
2. Click **Choose this spot**.
3. Choose noise/crowding, enter a distinctive fictional note, and click **Confirm report**.
4. Show the returned database report ID and updated values, or reopen the spot to show **Latest report**.
5. Fully refresh the page and reopen the same spot. The same report ID/note must be read back from Supabase.

This meets the end-to-end action pattern: frontend request, database insert, returned value, UI update, and refresh persistence. A browser-local report alone is not proof of that database slice.

**Historical live proof:** on October 14, 2026, one clearly labeled fictional QA report was inserted for spot 1008. Supabase returned **report ID 11**. A full refresh and reopening the spot displayed the same ID and note with **Read from Supabase**. The note began `QA TEST - StudyBYU release verification 2026-10-14` (the actual note used a typographic dash). That test row was left in place. Its continued presence has not been checked on October 27.

The assignment called for:

- At least four ERD entities, attributes, and labeled relationships, with an ERD image embedded in the README. The implementation uses six core tables with sample rows.
- One working database-backed action that survives refresh.
- Five README sections: App Summary (5-8 sentences), ERD, Tech Stack with rationale, How to Get It Running, and Verifying the Vertical Slice.
- A demo video **under two minutes**, showing the button, changed UI, and refresh proof only.
- Submission as two links: video and public repository/README. The user/team must check access in an incognito/private window.

The supplied replacement ERD is `docs/erd.png`, embedded through `![Study BYU ERD](docs/erd.png)`. Do not generate a different ERD and substitute it without being asked. The user had trouble with GitHub image links when the upload did not preserve the expected paths.

## 8. Testing: what was actually verified

Latest label-cleanup verification on October 14:

- **17 unit tests passed**, including the new label-containment regression.
- The full SQL/frontend integration fixture passed, including all 45 campus-building actions, exactly three supported routes, all 42 coming-soon messages, dismiss/keyboard actions, campus zoom/reset, all 25 built-in spot actions, and existing report/reload flows.
- Browser measurement found **zero overflowing building-label bounds** among all 45 labels after the final fitting adjustment; the three supported labels stayed horizontal.
- “EXPLORE” status labels were absent. Phone layout had no page-wide horizontal overflow.

Earlier October 14 verification also covered:

- All **23 floor-map views** at laptop **1366×900** and phone **390×844** sizes, with native SVG geometry and room labels visible.
- All 23 source PDFs and 23 SVG assets returning HTTP 200 with correct content types.
- Room search, floor/side switching, labels, zoom/fit/pan, filters, saved lists, suggestion validation, reservation links, denied report saves, escaped notes, and duplicate-submit protection.
- Local favorites, lists, filters, and suggestion/report persistence after refresh.
- All four scripts in `npm run test:integration`: `test-integration.mjs`, `test-existing-schema.mjs`, `test-actual-schema.mjs`, and `test-preserve-existing.mjs`.
- SQL fixtures tested foreign keys, identity/default values, 1/2/3 levels, RLS/grants, forbidden writes, preservation of existing rows, and latest-per-spot behavior with a large synthetic report dataset.
- A freshly extracted ZIP was tested, not just the development folder.

The SQL/frontend fixtures use local fictional PostgreSQL data through PGlite and LinkeDOM. They do not run migrations against the team's live project or read its real `.env`. The live report-ID-11 browser test is separate evidence.

Some older paragraphs in `docs/verification.md` say 15 or 16 unit tests; those are historical counts before the latest label regression was added. The latest tested count is **17**. Do not represent October 14 results as a new October 27 test run or as an unlimited production/security certification.

## 9. GitHub and public hosting

The GitHub copy inspected on October 14 was older, missing HBLL/JKB bundles, and had flattened directories. That explains why an uploaded copy could differ from the local app. **We did not push the corrected project or confirm a subsequent deployment.** The local project was not a configured Git checkout at the time of inspection. Inspect current status/remotes before making Git changes.

When replacing the repository contents, preserve this structure:

```text
repository root/
  index.html
  styles.css
  app.js
  database.js
  server.mjs
  package.json
  package-lock.json
  wsc-plans.js
  hbll-plans.js
  jkb-plans.js
  README.md
  .gitignore
  .env.example
  assets/
  docs/
  supabase/
  tests/
  tools/
```

Do not upload only HTML, only the unopened ZIP, or a flat collection of every file. Do not upload `.env` or `node_modules`. `.gitignore` prevents future tracking; it does not remove a secret already committed, so inspect tracked files before publishing.

**GitHub is source hosting, not the running Node backend.** GitHub Pages cannot execute `server.mjs` or load a private `.env` through `/api/config`. A static preview must not be presented as a working database vertical slice.

Public deployment has not been implemented. The current server deliberately binds to **127.0.0.1** and rejects non-local Host headers. It reads settings from a local `.env`; `PORT` is read from the process environment. A future Node-capable deployment therefore requires a deliberate host/bind/settings configuration, not merely uploading this unchanged local server. Get the user's hosting choice and review security before changing those protections.

The current database slice is a public, fictional classroom demo with a shared demo user, not a finished multi-user authentication/authorization system. Do not describe it as fully production-hardened.

## 10. Packaging and evidence files

From the project root:

```powershell
npm run package
```

This updates the **same** `StudyBYUProduct.zip` in the parent `outputs` folder. The packaging tool uses an explicit file list plus the `assets`, `docs`, `supabase`, `tests`, and `tools` folders. It excludes `.env`, `node_modules`, and logs, and refuses a nonblank URL/key in `.env.example`.

The last packaged delivery contained **87 files** and matched the current app source at the end of the label-cleanup turn. This handoff is a new documentation file; it is not in that historical ZIP until packaging is run again. Future file counts will therefore differ.

Useful screenshots already saved outside the production folder:

```text
C:\Users\camer\Documents\Codex\2026-10-01\h\work\campus-labels-fixed.jpg
C:\Users\camer\Documents\Codex\2026-10-01\h\work\campus-map-final.jpg
C:\Users\camer\Documents\Codex\2026-10-01\h\work\ux-audit\release-live-refresh-proof.jpg
```

`campus-labels-fixed.jpg` is the latest close-up without EXPLORE. `campus-map-final.jpg` predates that text cleanup and should not be used as proof of the final labels. Work-folder screenshots, extracted release-test copies, and audit tools are not additional product versions to maintain or publish.

## 11. Unfinished audit and other limits

The user previously supplied an assignment to document states, responsive behavior, and accessibility for five screens:

1. Explore.
2. Building/floor map.
3. Saved.
4. Spot details.
5. Confirm report.

The requested deliverable included five state answers per screen, annotated laptop/phone screenshots, Lighthouse scores, and navigation observations. Evidence was gathered, but a completed consolidated audit document was **not delivered** before the user switched back to functionality work.

The user said **“just skip that part. Ill do the navigation audit”** after discussion of screen-reader testing. Do not claim a completed Windows Narrator, NVDA, or full manual keyboard/screen-reader audit. Individual component keyboard checks are not equivalent to that full audit.

Preliminary materials are in `work/ux-audit/`: screenshots, DOM snapshots, metrics, and Lighthouse outputs. Some initial five-screen Lighthouse checks used frozen DOM copies, not a full interactive live-app audit. A later live campus-page run scored 100 for automated accessibility while still listing an advisory accessible-name mismatch. These results predate the final label cleanup; rerun if a current accessibility report is requested. A score of 100 does not establish complete accessibility.

Other limits remain intentional: only three buildings have floor maps; many spot locations/statuses are samples; favorites/suggestions are local; reports use a fictional shared demo user; no public database-enabled deployment or demo-video submission was completed by the assistant.

## 12. Recommended continuation

1. Read this file and inspect the existing StudyBYUProduct sources and any newer user edits.
2. Ask what the user wants to build next if no specific new feature was supplied. The last requested label cleanup is complete; no replacement design was pending.
3. If running the app, preserve `.env`, use the correct report table, choose a free local port, and verify the actual preview before saying it is open.
4. Make the smallest scoped change in this project. Preserve map geometry, catalogue IDs, existing database rows, and the distinction between local and Supabase persistence.
5. Run proportional tests. For map/routing/reporting changes, include `npm test`, the integration fixtures, and real browser checks; identify which are local fixtures versus live checks. Use clearly labeled fictional data if a live write is authorized and necessary.
6. Update the same ZIP only when a new packaged delivery is wanted. Keep secrets out of the handoff, screenshots, logs, repository, and archive.

### Short prompt to use in a new Codex chat

> Continue my existing Study BYU project. First read `docs/CODEX_HANDOFF.md` in the StudyBYUProduct folder and inspect the current files. Do not create a new product version, overwrite newer work, reset or reseed Supabase, or publish anything without my request. The campus map and label cleanup are complete. Preserve the existing floor plans and reporting vertical slice, then help me with my next requested change.
