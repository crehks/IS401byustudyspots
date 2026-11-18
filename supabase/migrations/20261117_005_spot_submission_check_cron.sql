-- Every minute, ask check-spot-submission to retry spot reports whose spam check has not completed.
-- Same pattern and the same Vault secret (cron_secret) as retry_pending_reports(); does nothing until that secret exists.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create or replace function public.retry_unchecked_spot_submissions() returns void
language plpgsql security definer set search_path = '' as $$
declare s text;
begin
  select decrypted_secret into s from vault.decrypted_secrets where name = 'cron_secret' limit 1;
  if s is null then return; end if;
  if not exists (select 1 from public."SpotSubmission"
                 where status = 'pending' and ai_checked_at is null and attempts < 8
                   and created_at < now() - interval '1 minute') then
    return;
  end if;
  perform net.http_post(
    url := 'https://nfbiqxoztpggfhbonqfy.supabase.co/functions/v1/check-spot-submission',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mYmlxeG96dHBnZ2ZoYm9ucWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTYwODksImV4cCI6MjEwNzA3MjA4OX0.5bX8_0xN5O_e-_UexdQQx30g0U49yzUq-GW49SyTpFw',
      'x-cron-secret', s),
    body := '{"retry":true}'::jsonb,
    timeout_milliseconds := 60000);
end $$;

revoke execute on function public.retry_unchecked_spot_submissions() from public, anon, authenticated;

select cron.schedule('retry-unchecked-spot-submissions', '* * * * *', 'select public.retry_unchecked_spot_submissions()');
