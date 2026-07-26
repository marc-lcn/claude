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
-- contrairement à la fois précédente (migration 11, désormais marquée
-- obsolète/dangereuse), cette suppression n'est plus définitive : les
-- règles resteront consultables (et restaurables via
-- restaurer_regle_supprimee()) dans cette archive.
--
-- Ne touche ni aux opérations bancaires, ni à leur catégorie déjà validée —
-- seul le dictionnaire de règles est vidé.
--
-- Fonctionne aussi si regles_categorisation est déjà vide (0 ligne à
-- supprimer, vérification ci-dessous automatiquement satisfaite : 0 = 0).
--
-- La vérification compare précisément le nombre de lignes présentes AVANT
-- suppression au nombre de nouvelles lignes archivées PAR CE SCRIPT (et non
-- un simple "total archivé > 0", qui serait vrai même si l'archivage avait
-- partiellement échoué). En cas d'écart, l'exception fait échouer tout le
-- bloc — le "delete" y compris, puisqu'il s'exécute dans la même
-- transaction implicite : soit tout est supprimé ET archivé, soit rien.
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

do $$
declare
  v_avant_suppression int;
  v_archive_avant int;
  v_archive_apres int;
  v_nouvellement_archivees int;
begin
  select count(*) into v_avant_suppression from regles_categorisation;
  select count(*) into v_archive_avant from regles_categorisation_supprimees;

  delete from regles_categorisation;

  select count(*) into v_archive_apres from regles_categorisation_supprimees;
  v_nouvellement_archivees := v_archive_apres - v_archive_avant;

  if v_nouvellement_archivees <> v_avant_suppression then
    raise exception
      'Incohérence détectée : % règle(s) à supprimer, mais % nouvellement archivée(s). Suppression annulée par sécurité.',
      v_avant_suppression, v_nouvellement_archivees;
  end if;

  raise notice
    '% règle(s) supprimée(s) et toutes archivées (archive : % ligne(s) au total).',
    v_avant_suppression, v_archive_apres;
end $$;

-- ======================================================================
-- VÉRIFICATION — à relancer séparément après le bloc ci-dessus.
-- ======================================================================
select count(*) as regles_restantes from regles_categorisation;             -- doit valoir 0
select count(*) as regles_archivees_au_total from regles_categorisation_supprimees; -- doit être > 0 si des règles existaient

-- ======================================================================
-- FIN
-- ======================================================================
