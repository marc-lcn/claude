-- ======================================================================
-- GEM.VAP PILOTAGE — LOT D : journal d'audit métier
-- ----------------------------------------------------------------------
-- Nouvelle table "journal_audit", séparée de la table technique existante
-- "historique_modifications" (diffs JSON bruts sur ca_journalier / regles_
-- categorisation / operations_bancaires, déjà en place — non modifiée ici).
-- Ce nouveau journal est orienté métier : un résumé lisible par humain par
-- événement notable (qui, quoi, quand, sur quel élément), pas une trace de
-- chaque écriture technique.
--
-- Append-only : RLS active, une policy SELECT et une policy INSERT pour le
-- dirigeant connecté, AUCUNE policy UPDATE ni DELETE. En PostgreSQL,
-- l'absence de policy pour une opération = refus par défaut dès que la RLS
-- est active : ni un bug dans le code, ni une faille applicative ne peuvent
-- modifier ou supprimer une entrée existante. Une correction éventuelle
-- doit être une NOUVELLE entrée (type_action = 'correction'), jamais une
-- modification d'une ligne existante.
--
-- Script réexécutable sans erreur.
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

create table if not exists journal_audit (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Rempli automatiquement côté serveur, jamais transmis par le navigateur :
  -- impossible à falsifier depuis le JavaScript.
  utilisateur_id uuid not null default auth.uid(),

  -- Origine de l'événement. Aujourd'hui toujours 'application' (valeur par
  -- défaut, le code n'a pas besoin de la préciser) ; prévu pour de futures
  -- écritures depuis une migration SQL, un script ponctuel, ou une
  -- correction manuelle documentée.
  source text not null default 'application'
    check (source in ('application','migration','script','correction')),

  -- Liste fermée : évite les fautes de frappe qui rendraient le journal
  -- inexploitable, et documente en base la liste des événements suivis.
  -- Extensible plus tard par une simple migration (ajout d'une valeur).
  type_action text not null check (type_action in (
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
    'correction'
  )),

  -- Tous les événements sont enregistrés en 'info' aujourd'hui, sauf deux
  -- cas concrets déjà câblés en 'avertissement' : un import bancaire avec
  -- anomalies (lignes à date illisible), et la modification d'une opération
  -- déjà validée. La valeur 'erreur' existe et est prête, mais n'est pas
  -- encore utilisée (journaliser les échecs est hors périmètre de ce lot).
  gravite text not null default 'info' check (gravite in ('info','avertissement','erreur')),

  -- Table et identifiant concernés. AUCUNE clé étrangère volontairement :
  -- si element_id référençait par exemple categories(id), supprimer une
  -- catégorie serait bloqué (ou casserait la référence historique) — ce qui
  -- irait à l'encontre même de l'objectif du journal. Ces colonnes restent
  -- donc lisibles même après suppression de la ligne qu'elles désignent.
  table_concernee text,
  element_id uuid,

  -- Résumé métier lisible par un humain, ex. :
  -- "Import bancaire juin 2026 : 45 nouvelles opérations, 285 doublons ignorés"
  resume text not null,

  -- Détails structurés optionnels (compteurs, anciennes/nouvelles valeurs...),
  -- en complément du résumé texte — utile plus tard pour des statistiques ou
  -- des recherches sans reparser du texte libre.
  details jsonb
);

create index if not exists idx_journal_audit_created_at on journal_audit (created_at desc);
create index if not exists idx_journal_audit_type_action on journal_audit (type_action);
create index if not exists idx_journal_audit_element on journal_audit (table_concernee, element_id);

alter table journal_audit enable row level security;

do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'journal_audit'
  loop
    execute format('drop policy if exists %I on public.journal_audit;', pol.policyname);
  end loop;
end $$;

create policy "dirigeant_lecture_audit"
on public.journal_audit
for select
using (exists (select 1 from profils p where p.id = auth.uid() and p.role = 'dirigeant' and p.actif));

create policy "dirigeant_ecriture_audit"
on public.journal_audit
for insert
with check (exists (select 1 from profils p where p.id = auth.uid() and p.role = 'dirigeant' and p.actif));

-- Volontairement AUCUNE policy UPDATE ni DELETE : c'est ce qui garantit le
-- caractère append-only (voir explication en tête de fichier).

-- ======================================================================
-- VÉRIFICATION — doit renvoyer 2 lignes (select, insert), aucune update/delete.
-- ======================================================================
select policyname, cmd, permissive, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'journal_audit';

-- ======================================================================
-- FIN
-- ======================================================================
