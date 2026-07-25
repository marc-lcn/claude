-- ======================================================================
-- GEM.VAP PILOTAGE — LOT C, ÉTAPE 1 : empreinte anti-doublon (backfill)
-- ----------------------------------------------------------------------
-- Objectif : rendre l'import bancaire idempotent (réimporter le même
-- relevé plusieurs fois ne doit jamais créer de doublon).
--
-- Cette étape 1 :
--   1. ajoute la colonne "empreinte_import" à operations_bancaires ;
--   2. calcule cette empreinte pour TOUTES les lignes déjà existantes ;
--   3. affiche deux requêtes de diagnostic à vérifier avant de continuer.
--
-- Elle ne pose AUCUNE contrainte (pas de NOT NULL, pas d'index unique) :
-- si des doublons existent déjà dans les données actuelles (l'import n'a
-- jamais eu de protection jusqu'ici), cette étape ne peut pas échouer.
--
-- ⚠️ NE PASSEZ À L'ÉTAPE 2 (fichier "..._etape2_contrainte.sql") QUE SI
-- LES DEUX REQUÊTES DE DIAGNOSTIC EN BAS DE CE SCRIPT RENVOIENT 0 LIGNE.
-- Si l'une des deux renvoie des lignes, ne continuez pas : prévenez-moi
-- avec le résultat, on décidera ensemble quoi faire de ces doublons.
--
-- Algorithme de l'empreinte (miroir exact de calculerEmpreinteOperation()
-- dans index.html, version EMPREINTE_VERSION = 1 au moment de l'écriture
-- de ce script) :
--
--   v{VERSION}|{date UTC (jour)}|{libellé normalisé}|{débit}|{crédit}|{occurrence}
--
--   - libellé normalisé = espaces multiples réduits à un seul, sans espace
--     au début/fin, tout en majuscules (pas de suppression des accents) ;
--   - débit / crédit formatés en texte à 2 décimales fixes, vide si NULL ;
--   - occurrence = rang (0, 1, 2…) de la ligne parmi les lignes du MÊME
--     import ayant exactement la même date/libellé/débit/crédit — permet
--     de distinguer deux opérations réellement identiques et légitimes
--     (même jour, même libellé, même montant) sans jamais les fusionner.
--
-- ⚠️ Si EMPREINTE_VERSION change un jour dans index.html, ce script de
-- backfill devra être adapté en miroir (il n'y a pas de synchronisation
-- automatique entre le JavaScript et ce SQL).
--
-- Script réexécutable sans erreur (ADD COLUMN IF NOT EXISTS + UPDATE
-- déterministe : relancer ce script ne fait que recalculer les mêmes
-- valeurs).
--
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

-- 1. Ajout de la colonne (pas encore de contrainte).
alter table public.operations_bancaires
  add column if not exists empreinte_import text;

-- 2. Calcul de l'empreinte pour les lignes existantes.
--    "at time zone 'UTC'" garantit qu'on lit le même jour calendaire que
--    celui encodé par l'application (le fichier Excel produit une date
--    stockée à minuit UTC — voir toLocalISODate / dateVal.slice(0,10)
--    dans index.html), quel que soit le fuseau horaire de la session SQL.
with numerotees as (
  select
    id,
    row_number() over (
      partition by
        import_id,
        (date_operation at time zone 'UTC')::date,
        upper(regexp_replace(trim(both from libelle), '\s+', ' ', 'g')),
        coalesce(debit::text, ''),
        coalesce(credit::text, '')
      order by id
    ) - 1 as occurrence
  from public.operations_bancaires
)
update public.operations_bancaires o
set empreinte_import =
  'v1|' ||
  (o.date_operation at time zone 'UTC')::date::text || '|' ||
  upper(regexp_replace(trim(both from o.libelle), '\s+', ' ', 'g')) || '|' ||
  coalesce(o.debit::text, '') || '|' ||
  coalesce(o.credit::text, '') || '|' ||
  n.occurrence::text
from numerotees n
where o.id = n.id;

-- ======================================================================
-- DIAGNOSTIC 1 — doublons d'empreinte parmi les données existantes.
-- Résultat attendu : 0 ligne.
-- ======================================================================
select empreinte_import, count(*) as nb_lignes
from public.operations_bancaires
group by empreinte_import
having count(*) > 1;

-- ======================================================================
-- DIAGNOSTIC 2 — lignes sans empreinte calculée (ne devrait jamais
-- arriver, sauf table vide).
-- Résultat attendu : 0 ligne.
-- ======================================================================
select count(*) as lignes_sans_empreinte
from public.operations_bancaires
where empreinte_import is null;

-- ======================================================================
-- FIN DE L'ÉTAPE 1 — vérifiez les deux résultats ci-dessus avant de
-- passer à "26_import_bancaire_idempotent_etape2_contrainte.sql".
-- ======================================================================
