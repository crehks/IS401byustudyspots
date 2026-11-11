/* Dev page settings. Defaults to the LOCAL dev backend (npm run dev:backend), not the live Supabase project.
 * Point this at a real project only after the team approves the dev-page migrations.
 * Browser-safe values only: NEVER a secret/service-role key here. */
window.NOOK_ADMIN_CONFIG = {
  url: 'http://127.0.0.1:54321',
  key: 'sb_publishable_local_dev_only'
};
