-- ======================================================================
-- JÉTHRO — Filet de sécurité permanent sur les règles de catégorisation
-- ----------------------------------------------------------------------
-- Contexte : la migration 11 ("suppression_toutes_regles.sql") a été
-- exécutée un jour dans Supabase SQL Editor et a vidé irréversiblement la
-- table regles_categorisation. Aucune trace n'existait ailleurs : la table
-- historique_modifications n'enregistre volontairement QUE les créations et
-- modifications, jamais les suppressions (voir son propre commentaire
-- d'origine dans 01_creation_tables_gemvap.sql).
--
-- Cette migration crée une nouvelle table d'archive dédiée, alimentée par un
-- déclencheur BEFORE DELETE sur regles_categorisation : chaque règle
-- supprimée — une par une depuis l'application, ou en masse depuis SQL
-- Editor (delete from regles_categorisation; par exemple) — est copiée ici
-- AVANT de disparaître. Les triggers ligne par ligne de PostgreSQL se
-- déclenchent pour CHAQUE ligne affectée, y compris lors d'une suppression
-- en masse : ce filet fonctionne donc quelle que soit la façon dont la
-- suppression est déclenchée, y compris directement en SQL, ce qui aurait
-- empêché la perte initiale si cette migration avait existé plus tôt.
--
-- Cette archive est volontairement séparée de historique_modifications
-- (non modifiée ici, aucun risque pour ca_journalier / operations_bancaires
-- qui partagent son déclencheur) : périmètre strictement limité à
-- regles_categorisation, table par table, complexité minimale.
--
-- Script réexécutable sans erreur.
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

create table if not exists regles_categorisation_supprimees (
  id uuid primary key default gen_random_uuid(),
  regle_id uuid not null,              -- id d'origine de la règle supprimée (pas de FK : la règle n'existe plus)
  mot_cle text not null,
  categorie_id uuid,                   -- pas de FK non plus : reste lisible même si la catégorie est supprimée plus tard
  affectation text,
  priorite int,
  confiance numeric(5,2),
  actif boolean,
  commentaire text,
  date_ajout date,
  derniere_utilisation date,
  regle_created_at timestamptz,        -- created_at d'origine de la règle (traçabilité complète)
  supprime_le timestamptz not null default now(),
  supprime_par uuid references profils(id)
);

create index if not exists idx_regles_supprimees_regle_id on regles_categorisation_supprimees (regle_id);
create index if not exists idx_regles_supprimees_mot_cle on regles_categorisation_supprimees (mot_cle);

-- Rempli automatiquement par le déclencheur ci-dessous, jamais par le
-- navigateur : impossible à contourner depuis le JavaScript de l'application.
create or replace function archiver_regle_supprimee()
returns trigger as $$
begin
  insert into regles_categorisation_supprimees(
    regle_id, mot_cle, categorie_id, affectation, priorite, confiance,
    actif, commentaire, date_ajout, derniere_utilisation, regle_created_at, supprime_par
  ) values (
    old.id, old.mot_cle, old.categorie_id, old.affectation, old.priorite, old.confiance,
    old.actif, old.commentaire, old.date_ajout, old.derniere_utilisation, old.created_at, auth.uid()
  );
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_archiver_regle_supprimee on regles_categorisation;
create trigger trg_archiver_regle_supprimee
  before delete on regles_categorisation
  for each row execute function archiver_regle_supprimee();

-- ----------------------------------------------------------------------
-- Sécurité (RLS) : lecture réservée au dirigeant connecté, aucune policy
-- d'écriture pour les utilisateurs — seul le déclencheur (security definer)
-- peut y insérer, jamais le navigateur directement. Pas de policy UPDATE ni
-- DELETE non plus : cette archive n'est elle-même jamais modifiée ni purgée.
-- ----------------------------------------------------------------------
alter table regles_categorisation_supprimees enable row level security;

do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'regles_categorisation_supprimees'
  loop
    execute format('drop policy if exists %I on public.regles_categorisation_supprimees;', pol.policyname);
  end loop;
end $$;

create policy "dirigeant_lecture_regles_supprimees"
on public.regles_categorisation_supprimees
for select
using (exists (select 1 from profils p where p.id = auth.uid() and p.role = 'dirigeant' and p.actif));

-- ======================================================================
-- VÉRIFICATION — doit renvoyer 1 ligne (select), aucune insert/update/delete.
-- ======================================================================
select policyname, cmd, permissive, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'regles_categorisation_supprimees';

-- ======================================================================
-- FIN
-- ======================================================================
