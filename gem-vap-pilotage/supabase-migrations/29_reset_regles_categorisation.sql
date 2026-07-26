-- ======================================================================
-- JÉTHRO — Repartir à zéro sur les règles de catégorisation
-- ----------------------------------------------------------------------
-- Suppression volontaire de toutes les règles actuelles, à la demande du
-- dirigeant, pour reconstituer le dictionnaire proprement au fil des
-- prochaines validations manuelles dans "Opérations à contrôler".
--
-- IMPORTANT : exécuter 28_archivage_regles_supprimees.sql AVANT ce script.
-- Grâce au déclencheur qu'il installe, chaque règle supprimée ici sera
-- copiée dans regles_categorisation_supprimees avant de disparaître — donc,
-- contrairement à la fois précédente (migration 11), cette suppression n'est
-- plus définitive : les règles resteront consultables dans cette table
-- d'archive si besoin de s'y référer plus tard.
--
-- Ne touche ni aux opérations bancaires, ni à leur catégorie déjà validée —
-- seul le dictionnaire de règles est vidé.
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

delete from regles_categorisation;

-- ======================================================================
-- VÉRIFICATION — doit renvoyer 0 (règles vidées) puis un nombre > 0
-- (règles archivées, preuve que le filet de sécurité a bien fonctionné).
-- ======================================================================
select count(*) as regles_restantes from regles_categorisation;
select count(*) as regles_archivees from regles_categorisation_supprimees;

-- ======================================================================
-- FIN
-- ======================================================================
