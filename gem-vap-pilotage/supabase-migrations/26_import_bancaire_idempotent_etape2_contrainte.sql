-- ======================================================================
-- GEM.VAP PILOTAGE — LOT C, ÉTAPE 2 : verrouillage de l'empreinte
-- ----------------------------------------------------------------------
-- ⚠️ NE PAS EXÉCUTER CE SCRIPT avant d'avoir vérifié que les deux
-- requêtes de diagnostic de l'étape 1 ("_etape1_backfill.sql") ont
-- bien renvoyé 0 ligne toutes les deux.
--
-- Cette étape :
--   1. rend la colonne "empreinte_import" obligatoire (NOT NULL) ;
--   2. crée un index UNIQUE dessus.
--
-- C'est cet index unique qui constitue la protection de fond contre les
-- doublons : à partir de maintenant, la base de données elle-même refuse
-- toute ligne dont l'empreinte existe déjà, quel que soit le code qui
-- tente l'insertion (application, script, saisie manuelle en SQL...).
-- Le nouveau code d'import (index.html) s'appuie sur cet index via un
-- upsert "ON CONFLICT (empreinte_import) DO NOTHING".
--
-- Script réexécutable sans erreur (NOT NULL déjà posé / index déjà
-- existant ne provoquent pas d'erreur en cas de ré-exécution).
--
-- Si la table contient encore des doublons d'empreinte au moment de
-- l'exécution (diagnostic de l'étape 1 non nul, ignoré par erreur), la
-- création de l'index échouera avec une erreur explicite de PostgreSQL
-- ("could not create unique index... duplicate key") — dans ce cas,
-- aucune donnée n'est modifiée ni perdue, le script s'arrête simplement
-- sans effet. Revenez à l'étape 1 pour identifier et traiter ces lignes.
--
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

alter table public.operations_bancaires
  alter column empreinte_import set not null;

create unique index if not exists idx_operations_bancaires_empreinte_unique
  on public.operations_bancaires (empreinte_import);

-- ======================================================================
-- VÉRIFICATION — doit renvoyer une ligne, avec "UNIQUE INDEX" dans
-- indexdef.
-- ======================================================================
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'operations_bancaires'
  and indexname = 'idx_operations_bancaires_empreinte_unique';

-- ======================================================================
-- FIN — une fois ce script exécuté avec succès, le nouveau code
-- d'import (index.html) peut être déployé en toute sécurité.
-- ======================================================================
