-- ======================================================================
-- GEM.VAP PILOTAGE — Suivi des ventes par vendeur
-- À exécuter APRÈS avoir créé le bucket "ventes-vendeur" dans Storage
-- (Storage > New bucket > nom "ventes-vendeur" > Public bucket décoché)
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

alter table imports drop constraint if exists imports_type_import_check;
alter table imports add constraint imports_type_import_check
  check (type_import in ('banque','ca','salaire','loyer','justificatif','autre','ventes_vendeur'));

create table if not exists ventes_vendeur (
  id uuid primary key default gen_random_uuid(),
  exercice_id uuid references exercices(id),
  import_id uuid references imports(id),
  collaborateur_id uuid references collaborateurs(id),
  magasin_id uuid references magasins(id),
  mois text not null,
  nom_vendeur_brut text not null,
  ht numeric(12,2),
  ttc numeric(12,2),
  nb_ventes numeric(10,2),
  nb_articles int,
  panier_moyen numeric(10,2),
  nb_articles_moyen numeric(6,2),
  created_at timestamptz not null default now(),
  unique (magasin_id, mois, nom_vendeur_brut)
);

alter table ventes_vendeur enable row level security;
drop policy if exists "dirigeant_acces_total" on ventes_vendeur;
create policy "dirigeant_acces_total" on ventes_vendeur
  for all
  using (exists (select 1 from profils p where p.id = auth.uid() and p.role = 'dirigeant' and p.actif))
  with check (exists (select 1 from profils p where p.id = auth.uid() and p.role = 'dirigeant' and p.actif));

drop policy if exists "dirigeant_stockage_ventes_vendeur" on storage.objects;
create policy "dirigeant_stockage_ventes_vendeur"
on storage.objects
for all
using (
  bucket_id = 'ventes-vendeur'
  and exists (select 1 from profils p where p.id = auth.uid() and p.role = 'dirigeant' and p.actif)
)
with check (
  bucket_id = 'ventes-vendeur'
  and exists (select 1 from profils p where p.id = auth.uid() and p.role = 'dirigeant' and p.actif)
);

-- ======================================================================
-- FIN
-- ======================================================================
