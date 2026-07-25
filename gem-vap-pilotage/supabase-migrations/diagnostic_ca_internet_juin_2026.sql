-- ======================================================================
-- GEM.VAP PILOTAGE — Diagnostic : détail des saisies sous "Internet" en juin 2026
-- Requête de lecture seule (ne modifie rien)
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

select date_operation, ca_ht, nb_tickets, commentaire
from ca_journalier
where magasin_id = (select id from magasins where code = 'INTERNET')
  and date_operation between '2026-06-01' and '2026-06-30'
order by date_operation;

-- ======================================================================
-- FIN
-- ======================================================================
