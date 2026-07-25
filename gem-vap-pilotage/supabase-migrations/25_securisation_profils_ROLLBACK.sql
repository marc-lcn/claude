-- ======================================================================
-- GEM.VAP PILOTAGE — ROLLBACK du Lot A (sécurisation de "profils")
-- ----------------------------------------------------------------------
-- À N'EXÉCUTER QUE SI la migration 25_securisation_profils.sql a causé
-- un problème réel dans l'application (ce qui n'est pas attendu, car
-- l'application ne lit/n'écrit jamais cette table). Restaure l'ancienne
-- policy unique, identique à celle de la migration 01 d'origine.
--
-- Script réexécutable sans erreur.
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

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

create policy "dirigeant_acces_total"
on public.profils
for all
using (id = auth.uid())
with check (id = auth.uid());

-- Vérification : doit renvoyer une ligne avec cmd = 'ALL'
select policyname, cmd, permissive, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'profils';

-- ======================================================================
-- FIN
-- ======================================================================
