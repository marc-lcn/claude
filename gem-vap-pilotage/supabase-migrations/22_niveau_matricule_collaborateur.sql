-- ======================================================================
-- GEM.VAP PILOTAGE — Ajoute le niveau et le matricule des salariés
-- (remplis automatiquement par l'extraction des bulletins de salaire,
-- modifiables à la main dans Paramètres > Salariés)
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

alter table collaborateurs add column if not exists niveau text;
alter table collaborateurs add column if not exists matricule text;

-- ======================================================================
-- FIN
-- ======================================================================
