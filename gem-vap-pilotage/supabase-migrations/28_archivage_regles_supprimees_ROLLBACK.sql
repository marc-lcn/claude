-- ======================================================================
-- ROLLBACK de 28_archivage_regles_supprimees.sql
-- Supprime le déclencheur, les deux fonctions et la table d'archive.
-- ATTENTION : supprime aussi l'historique déjà archivé (règles supprimées
-- avant ce rollback). À n'exécuter que si le filet de sécurité doit être
-- entièrement retiré.
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

drop trigger if exists trg_archiver_regle_supprimee on regles_categorisation;
drop function if exists archiver_regle_supprimee();
drop function if exists restaurer_regle_supprimee(uuid);
drop table if exists regles_categorisation_supprimees;

-- ======================================================================
-- FIN
-- ======================================================================
