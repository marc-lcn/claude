-- ======================================================================
-- GEM.VAP PILOTAGE — Journal des ventes mensuel (données détaillées)
-- Marge réelle, TVA collectée, encaissements par mode, avoirs
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

create table journaux_ventes_mensuels (
  id uuid primary key default gen_random_uuid(),
  exercice_id uuid references exercices(id),
  magasin_id uuid not null references magasins(id),
  mois text not null,                    -- format 'YYYY-MM'
  nb_tickets int,
  ca_ht numeric(12,2),
  tva numeric(12,2),
  ca_ttc numeric(12,2),
  marge numeric(12,2),
  marge_pct numeric(6,2),
  panier_moyen numeric(10,2),
  especes numeric(12,2),
  carte_bancaire numeric(12,2),
  cb_web numeric(12,2),
  shopify numeric(12,2),
  avoirs_emis numeric(12,2),
  avoirs_consommes numeric(12,2),
  commentaire text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (magasin_id, mois)
);

create trigger trg_updated_at_journaux
  before update on journaux_ventes_mensuels
  for each row execute function maj_updated_at();

alter table journaux_ventes_mensuels enable row level security;
create policy "dirigeant_acces_total" on journaux_ventes_mensuels
  for all
  using (exists (select 1 from profils p where p.id = auth.uid() and p.role = 'dirigeant' and p.actif))
  with check (exists (select 1 from profils p where p.id = auth.uid() and p.role = 'dirigeant' and p.actif));

-- ======================================================================
-- Données de juin 2026 (les 3 journaux de ventes que vous avez envoyés)
-- ======================================================================

insert into journaux_ventes_mensuels (
  exercice_id, magasin_id, mois, nb_tickets, ca_ht, tva, ca_ttc, marge, marge_pct,
  panier_moyen, especes, carte_bancaire, cb_web, shopify, avoirs_emis, avoirs_consommes
)
select e.id, m.id, v.mois, v.nb_tickets, v.ca_ht, v.tva, v.ca_ttc, v.marge, v.marge_pct,
  v.panier_moyen, v.especes, v.carte_bancaire, v.cb_web, v.shopify, v.avoirs_emis, v.avoirs_consommes
from (values
  ('TARBES', '2026-06', 1117, 27212.47, 5443.07, 32655.54, 15250.59, 56.0, 29.21, 5292.00, 27371.04, 0.00,   null,    7.10, 0.00),
  ('IBOS',   '2026-06', 2231, 55813.62, 11163.81, 66977.43, 30460.13, 54.6, 29.73, 8277.54, 57535.09, -55.40, 1132.20, 7.10, 2.00),
  ('PAU',    '2026-06', 2350, 51925.56, 10385.99, 62311.55, 28489.84, 54.9, 26.45, 6570.20, 55738.60, null,   null,   22.05, 24.40)
) as v(code, mois, nb_tickets, ca_ht, tva, ca_ttc, marge, marge_pct, panier_moyen, especes, carte_bancaire, cb_web, shopify, avoirs_emis, avoirs_consommes)
join magasins m on m.code = v.code
join exercices e on to_date(v.mois||'-01','YYYY-MM-DD') between e.date_debut and e.date_fin
on conflict (magasin_id, mois) do update set
  nb_tickets = excluded.nb_tickets, ca_ht = excluded.ca_ht, tva = excluded.tva, ca_ttc = excluded.ca_ttc,
  marge = excluded.marge, marge_pct = excluded.marge_pct, panier_moyen = excluded.panier_moyen,
  especes = excluded.especes, carte_bancaire = excluded.carte_bancaire, cb_web = excluded.cb_web,
  shopify = excluded.shopify, avoirs_emis = excluded.avoirs_emis, avoirs_consommes = excluded.avoirs_consommes;

-- ======================================================================
-- FIN
-- ======================================================================
