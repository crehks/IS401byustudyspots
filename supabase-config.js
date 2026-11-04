/* Public Supabase settings for static hosting (GitHub Pages), where server.mjs and /api/config do not exist.
 * Local runs (npm start) use .env first and only fall back to this file.
 * The publishable key is designed for browsers; row-level security is what protects the data.
 * NEVER put a secret/service-role key or database password here. */
window.STUDY_BYU_CONFIG = {
  url: "https://nfbiqxoztpggfhbonqfy.supabase.co",
  key: "sb_publishable_TeBfAziyTDAjxZnElW9tvg_Dr8qS0-X",
  table: 'ReportSpotStatus'
};
