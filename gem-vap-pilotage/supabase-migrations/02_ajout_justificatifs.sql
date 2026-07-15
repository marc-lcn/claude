-- ======================================================================
-- GEM.VAP PILOTAGE — Ajout : justificatifs liés aux opérations bancaires
-- À coller dans Supabase > SQL Editor > New query > Run
-- (à exécuter APRÈS avoir créé le bucket "justificatifs" dans Storage)
-- ======================================================================

-- Nouvelles colonnes sur operations_bancaires
alter table operations_bancaires
  add column if not exists piece_jointe_path text,
  add column if not exists piece_jointe_nom text,
  add column if not exists piece_jointe_ajoutee_le timestamptz;

-- Sécurité : seul le dirigeant peut lire/déposer/supprimer des fichiers
-- dans le bucket "justificatifs"
drop policy if exists "dirigeant_stockage_justificatifs" on storage.objects;

create policy "dirigeant_stockage_justificatifs"
on storage.objects
for all
using (
  bucket_id = 'justificatifs'
  and exists (select 1 from profils p where p.id = auth.uid() and p.role = 'dirigeant' and p.actif)
)
with check (
  bucket_id = 'justificatifs'
  and exists (select 1 from profils p where p.id = auth.uid() and p.role = 'dirigeant' and p.actif)
);

-- ======================================================================
-- FIN
-- ======================================================================
