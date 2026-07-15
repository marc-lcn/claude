-- ======================================================================
-- GEM.VAP PILOTAGE — Stockage des relevés bancaires (PDF/Excel originaux)
-- À exécuter APRÈS avoir créé le bucket "documents-bancaires" dans Storage
-- (Storage > New bucket > nom "documents-bancaires" > Public bucket décoché)
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

drop policy if exists "dirigeant_stockage_documents_bancaires" on storage.objects;

create policy "dirigeant_stockage_documents_bancaires"
on storage.objects
for all
using (
  bucket_id = 'documents-bancaires'
  and exists (select 1 from profils p where p.id = auth.uid() and p.role = 'dirigeant' and p.actif)
)
with check (
  bucket_id = 'documents-bancaires'
  and exists (select 1 from profils p where p.id = auth.uid() and p.role = 'dirigeant' and p.actif)
);

-- ======================================================================
-- FIN
-- ======================================================================
