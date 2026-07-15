-- ======================================================================
-- GEM.VAP PILOTAGE — Ajout des exercices comptables passés
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

insert into exercices (libelle, date_debut, date_fin, actif) values
  ('2023-2024', '2023-09-01', '2024-08-31', false),
  ('2024-2025', '2024-09-01', '2025-08-31', false)
on conflict (libelle) do nothing;

-- ======================================================================
-- FIN
-- ======================================================================
