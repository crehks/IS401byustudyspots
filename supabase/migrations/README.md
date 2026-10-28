# ERD report-slice migration

This folder describes the **fresh lowercase schema**, which differs from the team's existing numeric `ReportSpotStatus` schema. See the [SQL file guide](../../docs/FILE_GUIDE.md#sql-files-choose-by-schema) before choosing a setup file. Normal app development does not require rerunning setup SQL.

Run `20261008_001_report_slice.sql` once in a fresh development project, then run `../seed.sql`. The migration creates six entities from the team's supplied ERD, their constraints, RLS policies, and a latest-report view. Do not rerun it over existing tables or drop tables to resolve a conflict.

The old `../bootstrap-vertical-slice.sql` is a legacy one-table smoke test, not used by this version. See `../../docs/supabase-setup.md` for exact setup and verification instructions.
