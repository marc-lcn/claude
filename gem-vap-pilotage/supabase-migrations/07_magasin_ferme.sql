-- ======================================================================
-- GEM.VAP PILOTAGE — Ajout : case "magasin fermé" sur la saisie du CA
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

alter table ca_journalier
  add column if not exists ferme boolean not null default false;

-- Le CA n'est plus obligatoire (un jour "fermé" peut ne rien avoir à saisir)
alter table ca_journalier
  alter column ca_ht drop not null;

-- ======================================================================
-- FIN
-- ======================================================================
