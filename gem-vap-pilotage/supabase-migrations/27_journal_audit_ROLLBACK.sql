-- ======================================================================
-- GEM.VAP PILOTAGE — ROLLBACK du Lot D (journal d'audit)
-- ----------------------------------------------------------------------
-- À N'EXÉCUTER QUE SI la migration 27_journal_audit.sql a causé un
-- problème réel. Supprime entièrement la table "journal_audit" et son
-- contenu — contrairement aux autres rollbacks de ce projet, celui-ci EST
-- destructeur (toutes les entrées du journal seraient perdues), car il n'y
-- a pas d'état "avant" à restaurer : la table n'existait pas avant ce lot.
--
-- Ne touche à rien d'autre : "historique_modifications" et toutes les
-- autres tables restent intactes.
--
-- Script réexécutable sans erreur.
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

drop table if exists public.journal_audit;

-- ======================================================================
-- VÉRIFICATION — doit renvoyer 0 ligne.
-- ======================================================================
select tablename from pg_tables
where schemaname = 'public' and tablename = 'journal_audit';

-- ======================================================================
-- FIN
-- ======================================================================
