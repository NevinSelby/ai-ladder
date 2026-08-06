-- Release notes are public vendor announcements, so gating them behind sign-in
-- gained nothing and hid the freshness card from signed-out users, who are
-- exactly the people deciding whether the curriculum is maintained.
--
-- Reads only. The nightly job writes with the service role, which bypasses RLS,
-- and there is still no insert policy for clients.
drop policy if exists "read source documents" on source_documents;
create policy "read source documents" on source_documents
  for select to anon, authenticated using (true);
