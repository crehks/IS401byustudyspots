-- Report a Spot page, "Recent reports" tab: a signed-in user may READ their own submissions (status only,
-- plus the fields shown in the list). Guests and other users still cannot read any submission, and
-- nobody can edit or delete one. Pending/approved/rejected is changed by the team, not by the public.
grant select (submission_id, created_at, user_id, building_id, floor_label, spot_name, status)
  on public."SpotSubmission" to authenticated;

drop policy if exists studybyu_read_own_submission on public."SpotSubmission";
create policy studybyu_read_own_submission on public."SpotSubmission" for select to authenticated
  using (user_id in (select u.user_id from public."User" u where u.auth_id = (select auth.uid())));
