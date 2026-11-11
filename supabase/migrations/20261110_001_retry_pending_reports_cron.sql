-- Additive: every minute, ask tag-report to retry reports left pending.
-- Does nothing until a Vault secret named cron_secret exists (same value as the CRON_SECRET Edge Function secret):
--   select vault.create_secret('<CRON_SECRET value>', 'cron_secret');

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create function public.retry_pending_reports() returns void
language plpgsql security definer set search_path = '' as $$
declare s text;
begin
  select decrypted_secret into s from vault.decrypted_secrets where name = 'cron_secret' limit 1;
  if s is null then return; end if;
  if not exists (select 1 from public.spot_reports
                 where status = 'pending' and attempts < 8 and created_at < now() - interval '1 minute') then
    return;
  end if;
  perform net.http_post(
    url := 'https://nfbiqxoztpggfhbonqfy.supabase.co/functions/v1/tag-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mYmlxeG96dHBnZ2ZoYm9ucWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTYwODksImV4cCI6MjEwNzA3MjA4OX0.5bX8_0xN5O_e-_UexdQQx30g0U49yzUq-GW49SyTpFw',
      'x-cron-secret', s),
    body := '{"retry":true}'::jsonb,
    timeout_milliseconds := 60000);
end $$;

revoke execute on function public.retry_pending_reports() from public, anon, authenticated;

select cron.schedule('retry-pending-reports', '* * * * *', 'select public.retry_pending_reports()');
