-- ======================================================================
-- GEM.VAP PILOTAGE — Ajout : stockage des bulletins de salaire (page Salariés)
-- À exécuter APRÈS avoir créé le bucket "bulletins-salaire" dans Storage
-- (Storage > New bucket > nom "bulletins-salaire" > Public bucket décoché)
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

-- Un seul bulletin par salarié et par mois (la page "Salariés" remplace le
-- document existant plutôt que d'en recréer un nouveau pour le même mois).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'salaires_collaborateur_mois_unique') then
    alter table salaires
      add constraint salaires_collaborateur_mois_unique unique (collaborateur_id, mois);
  end if;
end $$;

drop policy if exists "dirigeant_stockage_bulletins_salaire" on storage.objects;

create policy "dirigeant_stockage_bulletins_salaire"
on storage.objects
for all
using (
  bucket_id = 'bulletins-salaire'
  and exists (select 1 from profils p where p.id = auth.uid() and p.role = 'dirigeant' and p.actif)
)
with check (
  bucket_id = 'bulletins-salaire'
  and exists (select 1 from profils p where p.id = auth.uid() and p.role = 'dirigeant' and p.actif)
);

-- ======================================================================
-- FIN
-- ======================================================================
