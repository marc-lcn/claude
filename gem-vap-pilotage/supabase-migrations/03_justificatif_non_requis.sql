-- ======================================================================
-- GEM.VAP PILOTAGE — Ajout : "justificatif non requis" sur une opération
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

alter table operations_bancaires
  add column if not exists justificatif_non_requis boolean not null default false;

-- ======================================================================
-- FIN
-- ======================================================================
