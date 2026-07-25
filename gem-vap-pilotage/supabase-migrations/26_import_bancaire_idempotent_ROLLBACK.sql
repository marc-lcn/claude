-- ======================================================================
-- GEM.VAP PILOTAGE — ROLLBACK du Lot C (empreinte anti-doublon)
-- ----------------------------------------------------------------------
-- À N'EXÉCUTER QUE SI l'étape 2 a causé un problème réel (par exemple,
-- si le nouveau code d'import se met à échouer de façon inattendue et
-- qu'il faut revenir en arrière le temps d'investiguer).
--
-- Ce rollback retire la contrainte (NOT NULL + index unique) mais NE
-- SUPPRIME PAS la colonne "empreinte_import" ni les valeurs déjà
-- calculées : aucune donnée n'est perdue, la colonne redevient
-- simplement optionnelle et non contrainte, comme avant l'étape 2.
--
-- ⚠️ Après ce rollback, la protection anti-doublon en base est
-- désactivée. Si le code d'import (index.html) a déjà été déployé avec
-- l'upsert "ON CONFLICT (empreinte_import)", les imports continueront
-- de fonctionner (l'upsert se comporte comme un insert normal en
-- l'absence de contrainte unique), mais sans la protection de fond.
--
-- Script réexécutable sans erreur.
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

drop index if exists public.idx_operations_bancaires_empreinte_unique;

alter table public.operations_bancaires
  alter column empreinte_import drop not null;

-- ======================================================================
-- VÉRIFICATION — doit renvoyer 0 ligne (index supprimé).
-- ======================================================================
select indexname
from pg_indexes
where schemaname = 'public'
  and tablename = 'operations_bancaires'
  and indexname = 'idx_operations_bancaires_empreinte_unique';

-- ======================================================================
-- FIN
-- ======================================================================
