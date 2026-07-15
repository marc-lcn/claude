-- ======================================================================
-- GEM.VAP PILOTAGE — Suppression de toutes les règles de catégorisation
-- ATTENTION : action irréversible. Ne touche ni aux opérations bancaires,
-- ni à leur catégorie déjà validée — seul le dictionnaire de règles est vidé.
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

delete from regles_categorisation;

-- ======================================================================
-- FIN
-- ======================================================================
