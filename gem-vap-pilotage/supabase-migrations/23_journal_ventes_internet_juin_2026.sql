-- ======================================================================
-- GEM.VAP PILOTAGE — Journal des ventes "Internet" (juin 2026)
-- Repris de la ligne "Facture" du journal des ventes Ibos (les commandes
-- Shopify remontent dans la caisse Ibos sous ce type de document) :
-- HT/TTC/TVA/marge/panier moyen de la ligne Facture, encaissements
-- Shopify nets du remboursement CB Web du même document.
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

insert into journaux_ventes_mensuels (
  exercice_id, magasin_id, mois, nb_tickets, ca_ht, tva, ca_ttc, marge, marge_pct,
  panier_moyen, cb_web, shopify
)
select e.id, m.id, v.mois, v.nb_tickets, v.ca_ht, v.tva, v.ca_ttc, v.marge, v.marge_pct,
  v.panier_moyen, v.cb_web, v.shopify
from (values
  ('INTERNET', '2026-06', 21, 974.92, 194.98, 1169.90, 647.43, 66.4, 55.71, -55.40, 1132.20)
) as v(code, mois, nb_tickets, ca_ht, tva, ca_ttc, marge, marge_pct, panier_moyen, cb_web, shopify)
join magasins m on m.code = v.code
join exercices e on to_date(v.mois||'-01','YYYY-MM-DD') between e.date_debut and e.date_fin
on conflict (magasin_id, mois) do update set
  nb_tickets = excluded.nb_tickets, ca_ht = excluded.ca_ht, tva = excluded.tva, ca_ttc = excluded.ca_ttc,
  marge = excluded.marge, marge_pct = excluded.marge_pct, panier_moyen = excluded.panier_moyen,
  cb_web = excluded.cb_web, shopify = excluded.shopify;

-- ======================================================================
-- FIN
-- ======================================================================
