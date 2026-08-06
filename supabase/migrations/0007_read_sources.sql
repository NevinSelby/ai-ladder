-- Ingested vendor release notes are readable by any signed-in player.
--
-- The "changed this week" card shows them with their official URLs, so the
-- claim that the curriculum tracks vendor releases is checkable rather than
-- asserted. Writes stay service-role only: the nightly job bypasses RLS, and
-- there is deliberately no insert policy for clients.
drop policy if exists "read source documents" on source_documents;
create policy "read source documents" on source_documents
  for select to authenticated using (true);
