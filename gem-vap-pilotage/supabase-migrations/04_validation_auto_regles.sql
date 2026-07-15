-- ======================================================================
-- GEM.VAP PILOTAGE — Ajout : validation automatique pour les règles
-- que vous créez vous-même depuis "Opérations à contrôler"
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

alter table regles_categorisation
  add column if not exists validation_auto boolean not null default false;

-- ======================================================================
-- FIN
-- ======================================================================
