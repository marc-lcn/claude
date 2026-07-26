-- ======================================================================
-- JÉTHRO — Filet de sécurité permanent sur les règles de catégorisation
-- ----------------------------------------------------------------------
-- Contexte : la migration 11 ("suppression_toutes_regles.sql", désormais
-- marquée OBSOLÈTE/DANGEREUSE dans son propre fichier) a été exécutée un
-- jour dans Supabase SQL Editor et a vidé irréversiblement la table
-- regles_categorisation. Aucune trace n'existait ailleurs : la table
-- historique_modifications n'enregistre volontairement QUE les créations et
-- modifications, jamais les suppressions (voir son propre commentaire
-- d'origine dans 01_creation_tables_gemvap.sql).
--
-- Cette migration crée une table d'archive dédiée, alimentée par un
-- déclencheur BEFORE DELETE sur regles_categorisation : chaque règle
-- supprimée — une par une depuis l'application, ou en masse depuis SQL
-- Editor (delete from regles_categorisation; par exemple) — est copiée ici
-- AVANT de disparaître. Les triggers ligne par ligne de PostgreSQL se
-- déclenchent pour CHAQUE ligne affectée, y compris lors d'une suppression
-- en masse : ce filet fonctionne donc quelle que soit la façon dont la
-- suppression est déclenchée, y compris directement en SQL — ce qui aurait
-- empêché la perte initiale si cette migration avait existé plus tôt.
--
-- Elle ajoute aussi une fonction restaurer_regle_supprimee() permettant de
-- réinjecter une règle archivée dans regles_categorisation à la demande,
-- SANS jamais supprimer son entrée d'archive (trace permanente conservée).
--
-- Cette archive est volontairement séparée de historique_modifications
-- (non modifiée ici : aucun risque pour ca_journalier / operations_bancaires
-- qui partagent son déclencheur) : périmètre strictement limité à
-- regles_categorisation, complexité minimale.
--
-- Script réexécutable sans erreur.
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

-- ----------------------------------------------------------------------
-- 1. Table d'archive — reprend TOUTES les colonnes actuelles de
--    regles_categorisation (y compris validation_auto, ajoutée par la
--    migration 04), plus l'identifiant d'origine et la date de suppression.
--    Pas de clé étrangère sur regle_id/categorie_id : une règle supprimée
--    doit rester lisible même si la catégorie d'origine est supprimée plus
--    tard, et son ancien id n'existe de toute façon plus ailleurs.
-- ----------------------------------------------------------------------
create table if not exists regles_categorisation_supprimees (
  id uuid primary key default gen_random_uuid(),
  regle_id uuid not null,              -- id d'origine de la règle supprimée
  mot_cle text not null,
  categorie_id uuid,
  affectation text,
  priorite int,
  confiance numeric(5,2),
  actif boolean,
  validation_auto boolean,
  commentaire text,
  date_ajout date,
  derniere_utilisation date,
  regle_created_at timestamptz,        -- created_at d'origine de la règle (traçabilité complète)
  supprime_le timestamptz not null default now(),
  -- ON DELETE par défaut (NO ACTION), volontairement PAS de CASCADE : si un
  -- profil venait à être supprimé, on préfère bloquer plutôt que perdre
  -- silencieusement la trace de qui a supprimé une règle. En pratique les
  -- profils ne sont jamais supprimés dans cette application (seulement
  -- désactivés via profils.actif), donc ce cas ne se présente pas.
  supprime_par uuid references profils(id)
);

-- Cette table n'est JAMAIS purgée : aucune tâche planifiée, aucun cron,
-- aucune politique de rétention n'existe sur regles_categorisation_supprimees
-- dans ce projet. Les seules écritures possibles sont celles du déclencheur
-- ci-dessous (archivage) et de restaurer_regle_supprimee() (restauration,
-- qui n'écrit que dans regles_categorisation — jamais ici).
create index if not exists idx_regles_supprimees_regle_id on regles_categorisation_supprimees (regle_id);
create index if not exists idx_regles_supprimees_mot_cle on regles_categorisation_supprimees (mot_cle);

-- ----------------------------------------------------------------------
-- 2. Déclencheur d'archivage
-- ----------------------------------------------------------------------
-- Rempli automatiquement par le déclencheur, jamais par le navigateur :
-- impossible à contourner depuis le JavaScript de l'application. security
-- definer nécessaire ici : un dirigeant connecté a le droit de SUPPRIMER une
-- règle (RLS sur regles_categorisation) mais n'a volontairement AUCUNE
-- policy d'écriture directe sur l'archive — seul ce déclencheur peut y
-- insérer. "set search_path" fixé explicitement (public, pg_temp) : bonne
-- pratique de sécurité PostgreSQL pour toute fonction security definer,
-- qui empêche un search_path détourné de faire résoudre un nom d'objet non
-- qualifié vers un objet malveillant plutôt que le bon.
create or replace function archiver_regle_supprimee()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into regles_categorisation_supprimees(
    regle_id, mot_cle, categorie_id, affectation, priorite, confiance,
    actif, validation_auto, commentaire, date_ajout, derniere_utilisation,
    regle_created_at, supprime_par
  ) values (
    old.id, old.mot_cle, old.categorie_id, old.affectation, old.priorite, old.confiance,
    old.actif, old.validation_auto, old.commentaire, old.date_ajout, old.derniere_utilisation,
    old.created_at, auth.uid()
  );
  return old;
end;
$$;

drop trigger if exists trg_archiver_regle_supprimee on regles_categorisation;
create trigger trg_archiver_regle_supprimee
  before delete on regles_categorisation
  for each row execute function archiver_regle_supprimee();

-- ----------------------------------------------------------------------
-- 3. Sécurité (RLS) sur l'archive
-- ----------------------------------------------------------------------
-- Lecture réservée au dirigeant connecté et actif. AUCUNE policy INSERT,
-- UPDATE ou DELETE : personne ne peut écrire ici directement depuis
-- l'application ou l'API — seul le déclencheur (security definer, donc
-- non soumis à la RLS) peut y insérer, et rien ni personne ne peut y
-- modifier ou supprimer une ligne existante. Avec la RLS activée, l'absence
-- de policy pour une opération donnée équivaut à un refus par défaut : sans
-- policy publique/anon non plus, la table n'est accessible à personne
-- d'autre qu'un dirigeant authentifié.
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

-- ----------------------------------------------------------------------
-- 4. Restauration d'une règle archivée
-- ----------------------------------------------------------------------
-- Réinsère une règle archivée dans regles_categorisation avec un NOUVEL id
-- (jamais l'ancien) : aucun risque de conflit de clé primaire, même si
-- l'ancien id avait par extraordinaire été réutilisé depuis. Il n'existe
-- aucune contrainte unique sur mot_cle dans regles_categorisation : une
-- restauration ne peut donc pas non plus entrer en conflit avec une règle
-- déjà recréée manuellement portant le même mot-clé.
-- N'écrit JAMAIS dans regles_categorisation_supprimees : la ligne d'archive
-- reste en place après restauration (trace permanente, comme demandé).
-- security invoker (par défaut, pas de "security definer") : cette fonction
-- ne fait qu'utiliser les droits déjà accordés par la RLS au dirigeant
-- connecté (lecture de l'archive, écriture sur regles_categorisation) —
-- aucune élévation de privilège nécessaire ni souhaitable ici. Le contrôle
-- explicite ci-dessous donne simplement un message d'erreur clair plutôt
-- qu'un refus RLS opaque.
create or replace function restaurer_regle_supprimee(p_archive_id uuid)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_archive regles_categorisation_supprimees%rowtype;
  v_nouvel_id uuid;
begin
  if not exists (select 1 from profils p where p.id = auth.uid() and p.role = 'dirigeant' and p.actif) then
    raise exception 'Non autorisé.';
  end if;

  select * into v_archive from regles_categorisation_supprimees where id = p_archive_id;
  if not found then
    raise exception 'Entrée d''archive introuvable : %', p_archive_id;
  end if;

  if v_archive.categorie_id is null or not exists (select 1 from categories c where c.id = v_archive.categorie_id) then
    raise exception 'Catégorie d''origine introuvable ou supprimée : restauration impossible sans catégorie valide. Recréez la règle manuellement en choisissant une catégorie existante.';
  end if;

  insert into regles_categorisation (
    mot_cle, categorie_id, affectation, priorite, confiance, actif,
    validation_auto, commentaire, date_ajout, derniere_utilisation
  ) values (
    v_archive.mot_cle, v_archive.categorie_id, v_archive.affectation,
    coalesce(v_archive.priorite, 1), coalesce(v_archive.confiance, 100),
    coalesce(v_archive.actif, true), coalesce(v_archive.validation_auto, false),
    v_archive.commentaire, coalesce(v_archive.date_ajout, current_date), v_archive.derniere_utilisation
  )
  returning id into v_nouvel_id;

  return v_nouvel_id;
end;
$$;

-- ======================================================================
-- VÉRIFICATION
-- ======================================================================
-- 1) Doit renvoyer 1 ligne (select), aucune insert/update/delete.
select policyname, cmd, permissive, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'regles_categorisation_supprimees';

-- 2) Doit renvoyer les deux fonctions avec un search_path fixé (colonne
--    proconfig non vide, contenant "search_path=public, pg_temp").
select p.proname, p.prosecdef as security_definer, p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('archiver_regle_supprimee', 'restaurer_regle_supprimee');

-- ======================================================================
-- FIN
-- ======================================================================
