-- ======================================================================
-- GEM.VAP PILOTAGE — Vérification et réparation : CA Pau du 30/06/2026
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

-- 1) Vérifier ce qui existe actuellement pour ce jour/magasin
select * from ca_journalier
where date_operation = '2026-06-30'
  and magasin_id = (select id from magasins where code = 'PAU');

-- 2) Restaurer la valeur (crée la ligne si absente, la corrige si elle existe déjà)
insert into ca_journalier (exercice_id, date_operation, magasin_id, ca_ht, nb_tickets)
select e.id, '2026-06-30', m.id, 2272.02, 109
from magasins m, exercices e
where m.code = 'PAU'
  and '2026-06-30' between e.date_debut and e.date_fin
on conflict (date_operation, magasin_id) do update set
  ca_ht = excluded.ca_ht,
  nb_tickets = excluded.nb_tickets;

-- ======================================================================
-- FIN
-- ======================================================================
