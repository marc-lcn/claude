-- ======================================================================
-- GEM.VAP PILOTAGE — LOT A : sécurisation de la table "profils"
-- ----------------------------------------------------------------------
-- Corrige une faille : l'ancienne policy ("for all" avec la même
-- condition id = auth.uid() en lecture ET en écriture) autorisait tout
-- compte authentifié à s'auto-attribuer role='dirigeant', actif=true en
-- insérant sa propre ligne, ou à se réactiver après désactivation.
--
-- Nouveau comportement :
--   - lecture (SELECT) : autorisée uniquement sur sa propre fiche ;
--   - création/modification/suppression (INSERT/UPDATE/DELETE) : plus
--     aucune policy client => refusé pour tout le monde par PostgREST.
--     La table ne se gère plus que depuis ce SQL Editor.
--
-- Vérifié avant d'écrire ce script : l'application (index.html) ne lit
-- ni n'écrit jamais "profils" depuis le navigateur — cette table n'est
-- utilisée que dans les policies RLS des autres tables, évaluées côté
-- serveur. Aucun impact fonctionnel attendu.
--
-- Script réexécutable sans erreur : il supprime dynamiquement TOUTES
-- les policies existantes sur "profils" (quel que soit leur nom) avant
-- de recréer la seule policy voulue.
--
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

-- La RLS était déjà active sur "profils" ; cette ligne est sans effet si
-- c'est déjà le cas (pas d'erreur en cas de ré-exécution).
alter table public.profils enable row level security;

-- Supprime toutes les policies existantes sur "profils", quel que soit
-- leur nom, pour repartir d'un état propre à chaque exécution.
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'profils'
  loop
    execute format('drop policy if exists %I on public.profils;', pol.policyname);
  end loop;
end $$;

-- Seule policy autorisée désormais : lecture de sa propre fiche.
-- Aucune policy INSERT/UPDATE/DELETE => ces opérations sont refusées
-- par défaut dès lors que la RLS est active (comportement standard
-- PostgreSQL : pas de policy correspondante = accès refusé).
create policy "profil_lecture_soi_meme"
on public.profils
for select
using (id = auth.uid());

-- ======================================================================
-- VÉRIFICATION — à exécuter juste après (sélectionnez ces lignes puis
-- Run, ou laissez tout le script s'exécuter d'un coup : Supabase affiche
-- le résultat de la dernière requête SELECT du script).
--
-- Résultat attendu : EXACTEMENT UNE ligne, avec :
--   policyname = 'profil_lecture_soi_meme'
--   cmd        = 'SELECT'
--   qual       = contient "auth.uid()"
--   with_check = NULL (aucune policy d'écriture)
-- ======================================================================
select policyname, cmd, permissive, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'profils';

-- ======================================================================
-- FIN
-- ======================================================================
