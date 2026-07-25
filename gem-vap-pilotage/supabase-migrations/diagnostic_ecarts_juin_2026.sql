-- ======================================================================
-- GEM.VAP PILOTAGE — Diagnostic des écarts CA saisi / journal des ventes
-- Requête de lecture seule (ne modifie rien) — juin 2026, tous magasins actifs
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

select
  m.code,
  m.nom,
  jv.ca_ht as ca_ht_journal_des_ventes,
  coalesce(sum(cj.ca_ht), 0) as ca_ht_saisi_quotidien,
  round(coalesce(sum(cj.ca_ht), 0) - coalesce(jv.ca_ht, 0), 2) as ecart,
  count(cj.id) as nb_jours_saisis
from magasins m
left join journaux_ventes_mensuels jv
  on jv.magasin_id = m.id and jv.mois = '2026-06'
left join ca_journalier cj
  on cj.magasin_id = m.id and cj.date_operation between '2026-06-01' and '2026-06-30'
where m.actif
group by m.code, m.nom, jv.ca_ht, m.ordre_affichage
order by m.ordre_affichage;

-- ======================================================================
-- FIN
-- ======================================================================
