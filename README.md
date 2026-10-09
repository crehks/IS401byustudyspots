# Study BYU

## App Summary

College students frequently struggle to find campus study spaces that accommodate their specific needs, especially when trying to coordinate a spot for a group. Without a reliable way to check space layouts, typical noise levels, or nearby amenities in advance, students waste valuable time wandering around and between buildings. This often leads to individuals and groups settling for unsatisfactory environments that negatively impact their overall productivity. To solve this, our app provides a comprehensive interactive map of campus study spaces designed to help students pinpoint an ideal spot, whether they are planning ahead or actively searching within a crowded building. Users can explore detailed floor plans of popular buildings and apply custom filters for group capacity, privacy requirements, general noise levels, and available outlets. As a supplementary feature, the platform incorporates user-submitted status reports, allowing students to share near real-time crowding conditions to enhance the app's historical busyness data. Ultimately, the app eliminates the guesswork of finding a study spot, ensuring students can quickly secure an environment tailored to their exact needs.

This prototype uses illustrative inventory and historical data; reports are loaded on page refresh, not streamed live.

## ERD

![Study BYU ERD](<erd.png>)

This slice uses six ERD tables: `Buildings`, `Floors`, `SpotType`, `Study Spot`, `User`, and `ReportSpotStatus`. Buildings contain floors; study spots reference a building, floor, and type; reports reference a spot and user. All six contain sample rows. Other ERD entities remain outside this slice.

## Tech Stack

- **Frontend:** hand-built HTML, CSS, JavaScript, and SVG floor maps.
- **Backend/database:** Supabase's REST API and PostgreSQL, with row-level security.
- **Local server:** Node.js loads connection settings from `.env` and serves the app.

This approach keeps our custom map interface easy to edit while Supabase handles database hosting and API access.

## How to Get It Running

1. Clone this repository, or extract the `FINALDBWORKstudyBYU-PRESERVE.zip` project. Open the folder containing `package.json` in VS Code.
2. Install Node.js 22 or newer. Use the team's existing Supabase project; its database setup is complete. **Do not rerun sample-data scripts.**
3. Copy `.env.example` to `.env` beside `package.json`. Enter the project URL and its browser-safe publishable key:

   ```dotenv
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
   SUPABASE_REPORTS_TABLE=ReportSpotStatus
   ```

   `.env` is Git-ignored. Never commit real settings or use a secret/service-role key.
4. In VS Code's terminal, run `npm run check:db`. Both report-table and latest-view checks should pass. Then run `npm start`; no dependency installation is required to start the app.
5. Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Keep the terminal running. If port 3000 is busy, stop the old server or run `$env:PORT="3001"` in PowerShell before `npm start`, then open port 3001.

## Verifying the Vertical Slice

1. Select **WSC → Floor 1 → East → East hall tables (sample)**, then **Choose this spot**.
2. Choose noise and crowding levels, enter a distinctive fictional note such as `Refresh proof 42`, and click **Confirm report**.
3. The app inserts into `ReportSpotStatus` and displays the saved values and database-generated report ID. Reopen the spot to see **Latest report**.
4. Refresh the entire page and reopen that same spot. The note and report ID should remain: the app reads them again from `latest_report_spot_status`, not browser storage.
5. Confirm that same report ID exists in Supabase's `ReportSpotStatus` table.

Noise/crowding use **1 = Low, 2 = Medium, 3 = High**. The test spot uses ID **1008**, and reports use fictional demo user **1001**. Database reporting covers non-reservable built-in sample spots; favorites and user-added spot suggestions remain local.

For the assignment, record only the button, changed UI, and refresh proof in a video under two minutes. Submit the video link and public repository/README link; check both in a private browser window.
