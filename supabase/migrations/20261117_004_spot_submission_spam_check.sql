-- Spam protection for "Report a Spot". Guests and signed-in users can both report.
--  * the check-spot-submission Edge Function asks Gemini whether a submission is spam;
--    spam is set to 'rejected' with a reason, genuine reports stay 'pending' for the team (the AI never approves);
--  * each browser sends a random client_token, so guests (who all share user 1001) are limited per device and
--    can be matched to their own report for the spam check without any account;
--  * rate limits: signed-in accounts 5/hour, each device 5/hour, all guests together 60/hour (a backstop);
--  * signed-in users can only report as themselves (they could previously post as the shared guest id 1001).
alter table public."SpotSubmission" add column if not exists ai_checked_at timestamptz;
alter table public."SpotSubmission" add column if not exists ai_reason text;
alter table public."SpotSubmission" add column if not exists attempts smallint not null default 0;
alter table public."SpotSubmission" add column if not exists client_token text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'SpotSubmission_ai_reason_len') then
    alter table public."SpotSubmission" add constraint "SpotSubmission_ai_reason_len"
      check (ai_reason is null or char_length(ai_reason) <= 500);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'SpotSubmission_client_token_len') then
    alter table public."SpotSubmission" add constraint "SpotSubmission_client_token_len"
      check (client_token is null or char_length(client_token) between 16 and 64);
  end if;
end $$;

create index if not exists spotsubmission_unchecked_idx on public."SpotSubmission"(created_at)
  where status = 'pending' and ai_checked_at is null;
create index if not exists spotsubmission_token_idx on public."SpotSubmission"(client_token, created_at);

-- The form may write its own columns plus the device token. It still cannot write ai_checked_at, ai_reason or attempts.
grant insert (client_token) on public."SpotSubmission" to anon, authenticated;
-- A signed-in user may read the reason their report was denied. Guests cannot read anything.
grant select (ai_reason) on public."SpotSubmission" to authenticated;

-- Guests report as the shared guest user (1001); signed-in users report as themselves.
drop policy if exists studybyu_submit_spot_guest on public."SpotSubmission";
create policy studybyu_submit_spot_guest on public."SpotSubmission" for insert to anon
  with check (
    user_id = 1001 and status = 'pending' and approved_spot_id is null
    and building_id in (1001,1002,1003) and spot_type_id in (1001,1002,1003)
  );
drop policy if exists studybyu_submit_spot_user on public."SpotSubmission";
create policy studybyu_submit_spot_user on public."SpotSubmission" for insert to authenticated
  with check (
    user_id in (select u.user_id from public."User" u where u.auth_id = (select auth.uid()))
    and status = 'pending' and approved_spot_id is null
    and building_id in (1001,1002,1003) and spot_type_id in (1001,1002,1003)
  );

create or replace function public.spot_submission_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id = 1001 then
    -- Guests: per device, and a generous cap across all guests.
    if new.client_token is not null and (select count(*) from public."SpotSubmission"
         where client_token = new.client_token and created_at > now() - interval '1 hour') >= 5 then
      raise exception 'You have sent several reports recently. Please try again in a little while.' using errcode = 'P0001';
    end if;
    if (select count(*) from public."SpotSubmission"
         where user_id = 1001 and created_at > now() - interval '1 hour') >= 60 then
      raise exception 'We are getting a lot of reports right now. Please try again in a little while.' using errcode = 'P0001';
    end if;
  elsif (select count(*) from public."SpotSubmission"
           where user_id = new.user_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'You have sent several reports recently. Please try again in a little while.' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists spot_submission_rate_limit_trg on public."SpotSubmission";
create trigger spot_submission_rate_limit_trg
  before insert on public."SpotSubmission"
  for each row execute function public.spot_submission_rate_limit();
