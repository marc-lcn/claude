-- ======================================================================
-- GEM.VAP PILOTAGE — Liaison automatique des PDF déposés dans Storage
-- À exécuter APRÈS avoir déposé vos PDF dans documents-bancaires,
-- rangés dans des dossiers 2023 / 2024 / 2025 / 2026, chaque fichier
-- nommé "MM.AAAA.pdf" (ex : 2024/01.2024.pdf, 2024/02.2024.pdf...).
-- Peut être rejoué sans risque (idempotent).
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

update imports i
set chemin_storage = obj.name
from storage.objects obj
where obj.bucket_id = 'documents-bancaires'
  and i.type_import = 'banque'
  and obj.name = substring(i.mois, 1, 4) || '/' || substring(i.mois, 6, 2) || '.' || substring(i.mois, 1, 4) || '.pdf';

-- Combien de documents sont maintenant liés ?
select
  substring(mois,1,4) as annee,
  count(*) filter (where chemin_storage is not null) as documents_lies,
  count(*) as total_relevés
from imports
where type_import = 'banque'
group by 1
order by 1 desc;

-- ======================================================================
-- FIN
-- ======================================================================
