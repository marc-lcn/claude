-- ======================================================================
-- JÉTHRO 1.3.0 — Extension des types d'événements du journal d'audit
-- ----------------------------------------------------------------------
-- Ajoute 3 nouvelles valeurs autorisées pour journal_audit.type_action,
-- nécessaires au Lot H (centre d'administration) :
--   - restauration_regle   : une règle archivée est réinjectée dans
--                            regles_categorisation via restaurer_regle_supprimee()
--   - export_sauvegarde    : un export (CSV ou sauvegarde JSON complète)
--                            est généré depuis l'application
--   - import_sauvegarde    : un import (règles, catégories...) est effectué
--                            depuis l'application
--
-- Migration strictement ADDITIVE : aucune ligne existante n'est modifiée
-- ni supprimée. La contrainte CHECK est élargie (superset de l'ancienne
-- liste), jamais restreinte. Transactionnelle : soit tout s'applique, soit
-- rien (BEGIN/COMMIT explicite).
--
-- Script réexécutable sans erreur.
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

begin;

-- ----------------------------------------------------------------------
-- Vérification préalable : toutes les valeurs de type_action déjà
-- présentes en base doivent être couvertes par la liste FINALE (celle qui
-- inclut déjà les 3 nouvelles valeurs) — pas l'ancienne liste pré-Lot H.
-- Utiliser l'ancienne liste ici casserait la ré-exécution du script après
-- une première exécution réussie et un usage réel du Lot H (des lignes
-- avec restauration_regle / export_sauvegarde / import_sauvegarde
-- existeraient alors légitimement en base). Ce bloc échoue explicitement
-- si une valeur véritablement inattendue est détectée.
-- ----------------------------------------------------------------------
do $$
declare
  v_valeurs_inattendues text;
begin
  select string_agg(distinct type_action, ', ')
  into v_valeurs_inattendues
  from journal_audit
  where type_action not in (
    'import_bancaire',
    'creation_salarie','modification_salarie','desactivation_salarie','reactivation_salarie',
    'import_bulletin_salaire',
    'creation_categorie','modification_categorie','suppression_categorie',
    'creation_regle','modification_regle','suppression_regle',
    'creation_magasin','modification_magasin','desactivation_magasin','reactivation_magasin',
    'import_ca_vendeur',
    'remplacement_document',
    'correction_ca_tardive',
    'modification_operation_validee',
    'correction',
    'restauration_regle',
    'export_sauvegarde',
    'import_sauvegarde'
  );

  if v_valeurs_inattendues is not null then
    raise exception 'Valeurs de type_action déjà en base non couvertes par la liste attendue : %. Migration interrompue par sécurité, aucune modification appliquée.', v_valeurs_inattendues;
  end if;
end $$;

-- ----------------------------------------------------------------------
-- Remplacement de la contrainte CHECK relative à type_action UNIQUEMENT.
-- Nom recherché dynamiquement (créée sans nom explicite dans la migration
-- 27, PostgreSQL lui a donc attribué un nom automatique). Sécurité
-- supplémentaire : si plus d'une contrainte CHECK de journal_audit mentionne
-- "type_action" dans sa définition (cas anormal et inattendu), le script
-- s'arrête sans rien supprimer plutôt que de deviner laquelle cibler. Les
-- autres contraintes CHECK de la table (source, gravite) ne mentionnent pas
-- "type_action" dans leur définition et ne sont donc jamais concernées.
-- ----------------------------------------------------------------------
do $$
declare
  v_constraint_name text;
  v_nombre_correspondances int;
begin
  select count(*) into v_nombre_correspondances
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'journal_audit'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%type_action%';

  if v_nombre_correspondances > 1 then
    raise exception 'Ambiguïté détectée : % contrainte(s) CHECK de journal_audit mentionnent "type_action". Migration interrompue par sécurité — vérifier manuellement avant de continuer.', v_nombre_correspondances;
  end if;

  if v_nombre_correspondances = 1 then
    select con.conname into v_constraint_name
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'journal_audit'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%type_action%';

    execute format('alter table public.journal_audit drop constraint %I;', v_constraint_name);
  end if;
end $$;

alter table public.journal_audit add constraint journal_audit_type_action_check
  check (type_action in (
    'import_bancaire',
    'creation_salarie','modification_salarie','desactivation_salarie','reactivation_salarie',
    'import_bulletin_salaire',
    'creation_categorie','modification_categorie','suppression_categorie',
    'creation_regle','modification_regle','suppression_regle',
    'creation_magasin','modification_magasin','desactivation_magasin','reactivation_magasin',
    'import_ca_vendeur',
    'remplacement_document',
    'correction_ca_tardive',
    'modification_operation_validee',
    'correction',
    'restauration_regle',
    'export_sauvegarde',
    'import_sauvegarde'
  ));

commit;

-- ======================================================================
-- VÉRIFICATION — doit afficher la nouvelle définition, avec les 3
-- nouvelles valeurs incluses.
-- ======================================================================
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.journal_audit'::regclass and contype = 'c';

-- ======================================================================
-- FIN
-- ======================================================================
