-- ======================================================================
-- GEM.VAP PILOTAGE — Ajout de l'exercice comptable 2022-2023
-- Nécessaire pour couvrir janvier à août 2023
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

insert into exercices (libelle, date_debut, date_fin, actif) values
  ('2022-2023', '2022-09-01', '2023-08-31', false)
on conflict (libelle) do nothing;

-- ======================================================================
-- FIN
-- ======================================================================
