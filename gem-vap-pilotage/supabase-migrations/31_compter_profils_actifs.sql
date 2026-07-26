-- ======================================================================
-- JÉTHRO 1.3.0 — Fonction de comptage des profils actifs
-- ----------------------------------------------------------------------
-- Contexte : la RLS sur "profils" (migration 25) restreint volontairement
-- la lecture à sa propre fiche uniquement ("profil_lecture_soi_meme").
-- Un simple "select count(*) from profils" depuis le navigateur renverrait
-- donc toujours 1, quel que soit le nombre réel de profils actifs — une
-- valeur trompeuse. Cette fonction renvoie UNIQUEMENT un nombre entier,
-- jamais une ligne de la table "profils" : aucune donnée individuelle
-- (nom, email, id...) n'est exposée par ce mécanisme.
--
-- Sécurité :
--   - SECURITY DEFINER nécessaire ici (contrairement à
--     restaurer_regle_supprimee) : sans elle, la fonction resterait
--     soumise à la RLS de l'appelant et ne compterait que sa propre ligne.
--   - search_path fixé explicitement (public, pg_temp).
--   - vérifie en interne que l'appelant est un dirigeant actif avant de
--     renvoyer quoi que ce soit.
--   - EXECUTE retiré à PUBLIC, accordé uniquement au rôle "authenticated"
--     (jamais "anon") : un utilisateur non connecté ne peut pas l'appeler.
--
-- Script réexécutable sans erreur, aucune donnée modifiée ni supprimée.
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

create or replace function compter_profils_actifs()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_compte integer;
begin
  if not exists (select 1 from profils p where p.id = auth.uid() and p.role = 'dirigeant' and p.actif) then
    raise exception 'Non autorisé.';
  end if;

  select count(*) into v_compte from profils where actif = true;
  return v_compte;
end;
$$;

revoke all on function compter_profils_actifs() from public;
revoke all on function compter_profils_actifs() from anon;
grant execute on function compter_profils_actifs() to authenticated;

-- ======================================================================
-- VÉRIFICATION
-- ======================================================================
-- 1) Doit renvoyer un nombre entier (le nombre de profils actifs), si
--    exécuté ici en tant que postgres/service_role cette vérification
--    peut échouer avec "Non autorisé" (normal : postgres n'est pas un
--    dirigeant actif) — le test réel se fait depuis l'application connectée.
-- select compter_profils_actifs();

-- 2) Doit montrer EXECUTE accordé à "authenticated" uniquement, PUBLIC absent.
select grantee, privilege_type
from information_schema.routine_privileges
where routine_name = 'compter_profils_actifs';

-- ======================================================================
-- FIN
-- ======================================================================
