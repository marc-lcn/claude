-- ======================================================================
-- GEM.VAP PILOTAGE — Distingue bulletin de salaire / solde de tout compte
-- (un même salarié peut avoir les deux documents pour le même mois,
-- typiquement le mois de son départ)
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

alter table salaires
  add column if not exists type_document text not null default 'bulletin'
    check (type_document in ('bulletin','solde_tout_compte'));

-- Remplace l'ancienne contrainte (1 document / salarié / mois) par une
-- contrainte qui autorise un bulletin ET un solde de tout compte le même mois.
alter table salaires
  drop constraint if exists salaires_collaborateur_mois_unique;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'salaires_collaborateur_mois_type_unique') then
    alter table salaires
      add constraint salaires_collaborateur_mois_type_unique unique (collaborateur_id, mois, type_document);
  end if;
end $$;

-- ======================================================================
-- FIN
-- ======================================================================
