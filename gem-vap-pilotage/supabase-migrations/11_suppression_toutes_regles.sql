-- ======================================================================
-- ⚠️ OBSOLÈTE / DANGEREUX — NE PLUS JAMAIS EXÉCUTER CE SCRIPT TEL QUEL ⚠️
-- ----------------------------------------------------------------------
-- Ce script est celui qui a réellement vidé irréversiblement la table
-- regles_categorisation en production (incident confirmé) : à l'époque,
-- aucun mécanisme n'archivait les règles avant leur suppression, et la
-- table historique_modifications n'enregistre volontairement JAMAIS les
-- suppressions (voir son commentaire d'origine dans
-- 01_creation_tables_gemvap.sql). Le résultat a été une perte de données
-- totale et définitive.
--
-- Conservé ici uniquement pour la mémoire historique du projet (on ne
-- réécrit pas l'histoire des migrations déjà exécutées) — mais NE JAMAIS
-- LE RELANCER tel quel.
--
-- Si un jour un nouveau "repartir à zéro" sur les règles est nécessaire,
-- utiliser exclusivement :
--   1. 28_archivage_regles_supprimees.sql (filet de sécurité : archive
--      automatiquement chaque règle avant suppression, quelle que soit la
--      manière dont elle est supprimée)
--   2. 29_reset_regles_categorisation.sql (suppression totale sécurisée,
--      avec vérification que 100% des règles ont bien été archivées avant
--      de confirmer)
-- ======================================================================

-- ----------------------------------------------------------------------
-- GEM.VAP PILOTAGE — Suppression de toutes les règles de catégorisation
-- ATTENTION : action irréversible. Ne touche ni aux opérations bancaires,
-- ni à leur catégorie déjà validée — seul le dictionnaire de règles est vidé.
-- À coller dans Supabase > SQL Editor > New query > Run
-- ----------------------------------------------------------------------

delete from regles_categorisation;

-- ======================================================================
-- FIN
-- ======================================================================
