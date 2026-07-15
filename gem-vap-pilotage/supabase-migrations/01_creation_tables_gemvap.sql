-- ======================================================================
-- GEM.VAP PILOTAGE — Script de création de la base de données
-- À coller entièrement dans Supabase > SQL Editor > New query > Run
-- ======================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------
-- 1. PROFILS (le ou les utilisateurs autorisés à se connecter)
-- ----------------------------------------------------------------------
create table profils (
  id uuid primary key references auth.users(id) on delete cascade,
  nom text not null,
  role text not null default 'dirigeant' check (role in ('dirigeant')),
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------
-- 2. EXERCICES COMPTABLES (2025-2026, 2026-2027, etc.)
-- ----------------------------------------------------------------------
create table exercices (
  id uuid primary key default gen_random_uuid(),
  libelle text not null unique,        -- ex: '2025-2026'
  date_debut date not null,
  date_fin date not null,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------
-- 3. MAGASINS / ENTITÉS ANALYSÉES (Pau, Ibos, Tarbes, Internet, ...)
-- ----------------------------------------------------------------------
create table magasins (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,           -- PAU, IBOS, TARBES, INTERNET
  nom text not null,
  magasin_parent_id uuid references magasins(id),   -- Internet -> Ibos (rattachement admin)
  actif boolean not null default true,
  ordre_affichage int not null default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------
-- 4. COLLABORATEURS
-- ----------------------------------------------------------------------
create table collaborateurs (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  affectation text,                    -- PAU / IBOS / TARBES / COMMUN / DIRIGEANT
  poste text,
  statut text,
  date_entree date,
  date_sortie date,
  actif boolean not null default true,
  salaire_reference numeric(12,2),
  type_contrat text,
  commentaire text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------
-- 5. CATEGORIES (liste ouverte, on peut en ajouter à tout moment)
-- ----------------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  libelle text not null unique,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------
-- 6. REGLES DE CATEGORISATION (le "dictionnaire" qui apprend)
-- ----------------------------------------------------------------------
create table regles_categorisation (
  id uuid primary key default gen_random_uuid(),
  mot_cle text not null,
  categorie_id uuid not null references categories(id),
  affectation text,                    -- PAU / IBOS / TARBES / INTERNET / COMMUN / DIRIGEANT
  priorite int not null default 1,
  confiance numeric(5,2) not null default 100,
  actif boolean not null default true,
  commentaire text,
  date_ajout date not null default current_date,
  derniere_utilisation date,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------
-- 7. CA JOURNALIER (saisie quotidienne)
-- ----------------------------------------------------------------------
create table ca_journalier (
  id uuid primary key default gen_random_uuid(),
  exercice_id uuid not null references exercices(id),
  date_operation date not null,
  magasin_id uuid not null references magasins(id),
  ca_ht numeric(12,2) not null,
  nb_tickets int,
  taux_marge numeric(5,2),
  commentaire text,
  saisi_par uuid references profils(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (date_operation, magasin_id)
);

-- ----------------------------------------------------------------------
-- 8. IMPORTS (traçabilité de chaque fichier déposé)
-- ----------------------------------------------------------------------
create table imports (
  id uuid primary key default gen_random_uuid(),
  exercice_id uuid references exercices(id),
  type_import text not null check (type_import in ('banque','ca','salaire','loyer','justificatif','autre')),
  mois text,                           -- ex '2026-07'
  nom_fichier text not null,
  chemin_storage text,
  importe_par uuid references profils(id),
  importe_le timestamptz not null default now(),
  statut text not null default 'importé'
);

-- ----------------------------------------------------------------------
-- 9. OPERATIONS BANCAIRES (import Crédit Agricole)
-- ----------------------------------------------------------------------
create table operations_bancaires (
  id uuid primary key default gen_random_uuid(),
  exercice_id uuid references exercices(id),
  import_id uuid references imports(id),
  date_operation timestamptz not null,
  libelle text not null,
  debit numeric(12,2),
  credit numeric(12,2),
  montant_signe numeric(12,2) generated always as (coalesce(credit,0) - coalesce(debit,0)) stored,
  categorie_proposee_id uuid references categories(id),
  categorie_finale_id uuid references categories(id),
  affectation text,                    -- PAU / IBOS / TARBES / INTERNET / COMMUN / DIRIGEANT
  mot_cle_reconnu text,
  confiance numeric(5,2),
  etat text not null default 'a_categoriser'
    check (etat in ('reconnu_auto','a_verifier','a_categoriser','valide_manuel')),
  valide_manuellement boolean not null default false,
  commentaire text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------
-- 10. SALAIRES (structure prête, pas encore utilisée dans l'app)
-- ----------------------------------------------------------------------
create table salaires (
  id uuid primary key default gen_random_uuid(),
  exercice_id uuid references exercices(id),
  collaborateur_id uuid references collaborateurs(id),
  mois text not null,
  affectation text,
  brut numeric(12,2),
  net_paye numeric(12,2),
  charges_patronales numeric(12,2),
  cout_global numeric(12,2),
  titres_restaurant numeric(12,2),
  maladie_arret text,
  conges_n_1 numeric(6,2),
  conges_n numeric(6,2),
  heures_sup numeric(6,2),
  prime numeric(12,2),
  document_id uuid references imports(id),
  statut text not null default 'a_verifier',
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------
-- 11. LOYERS ET CHARGES (structure prête)
-- ----------------------------------------------------------------------
create table loyers_charges (
  id uuid primary key default gen_random_uuid(),
  exercice_id uuid references exercices(id),
  date_operation date,
  magasin_id uuid references magasins(id),
  type_charge text,
  montant numeric(12,2) not null,
  periode_concernee text,
  document_id uuid references imports(id),
  commentaire text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------
-- 12. CHARGES MANUELLES (URSSAF, TVA, IS) — structure prête
-- ----------------------------------------------------------------------
create table charges_manuelles (
  id uuid primary key default gen_random_uuid(),
  exercice_id uuid references exercices(id),
  mois text not null,
  urssaf_pau numeric(12,2),
  urssaf_ibos numeric(12,2),
  urssaf_tarbes numeric(12,2),
  urssaf_dirigeant numeric(12,2),
  tva_globale numeric(12,2),
  is_global numeric(12,2),
  commentaire text,
  created_at timestamptz not null default now(),
  unique (exercice_id, mois)
);

-- ----------------------------------------------------------------------
-- 13. HISTORIQUE DES MODIFICATIONS (traçabilité, jamais de suppression)
-- ----------------------------------------------------------------------
create table historique_modifications (
  id uuid primary key default gen_random_uuid(),
  table_cible text not null,
  ligne_id uuid not null,
  action text not null check (action in ('creation','modification','validation')),
  ancienne_valeur jsonb,
  nouvelle_valeur jsonb,
  utilisateur_id uuid references profils(id),
  date_action timestamptz not null default now()
);

-- ======================================================================
-- DÉCLENCHEURS AUTOMATIQUES
-- ======================================================================

-- Met à jour automatiquement "updated_at" à chaque modification
create or replace function maj_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_updated_at_ca before update on ca_journalier
  for each row execute function maj_updated_at();
create trigger trg_updated_at_banque before update on operations_bancaires
  for each row execute function maj_updated_at();
create trigger trg_updated_at_collab before update on collaborateurs
  for each row execute function maj_updated_at();

-- Enregistre chaque création/modification dans l'historique (jamais de suppression)
create or replace function enregistrer_historique()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    insert into historique_modifications(table_cible, ligne_id, action, nouvelle_valeur, utilisateur_id)
    values (tg_table_name, new.id, 'creation', to_jsonb(new), auth.uid());
    return new;
  elsif (tg_op = 'UPDATE') then
    insert into historique_modifications(table_cible, ligne_id, action, ancienne_valeur, nouvelle_valeur, utilisateur_id)
    values (tg_table_name, new.id,
      case when new.etat = 'valide_manuel' and old.etat is distinct from 'valide_manuel'
           then 'validation' else 'modification' end,
      to_jsonb(old), to_jsonb(new), auth.uid());
    return new;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_historique_ca
  after insert or update on ca_journalier
  for each row execute function enregistrer_historique();
create trigger trg_historique_banque
  after insert or update on operations_bancaires
  for each row execute function enregistrer_historique();
create trigger trg_historique_regles
  after insert or update on regles_categorisation
  for each row execute function enregistrer_historique();

-- ======================================================================
-- SÉCURITÉ (RLS) — accès réservé au dirigeant connecté
-- ======================================================================

-- La table "profils" a sa propre règle simplifiée (chacun ne voit/modifie que sa fiche),
-- pour éviter qu'elle se vérifie elle-même en boucle (erreur de récursion infinie).
alter table profils enable row level security;
create policy "dirigeant_acces_total" on profils
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'exercices','magasins','collaborateurs','categories',
      'regles_categorisation','ca_journalier','imports','operations_bancaires',
      'salaires','loyers_charges','charges_manuelles','historique_modifications'
    ])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format(
      'create policy "dirigeant_acces_total" on %I
       for all
       using (exists (select 1 from profils p where p.id = auth.uid() and p.role = ''dirigeant'' and p.actif))
       with check (exists (select 1 from profils p where p.id = auth.uid() and p.role = ''dirigeant'' and p.actif));', t
    );
  end loop;
end $$;

-- ======================================================================
-- DONNÉES DE DÉPART (reprises de votre fichier Excel)
-- ======================================================================

-- Exercices comptables
insert into exercices (libelle, date_debut, date_fin, actif) values
  ('2025-2026', '2025-09-01', '2026-08-31', true),
  ('2026-2027', '2026-09-01', '2027-08-31', false);

-- Magasins (Internet rattaché administrativement à Ibos)
insert into magasins (code, nom, ordre_affichage) values
  ('PAU', 'Pau', 1),
  ('IBOS', 'Ibos', 2),
  ('TARBES', 'Tarbes', 3);
insert into magasins (code, nom, magasin_parent_id, ordre_affichage)
  select 'INTERNET', 'Internet', id, 4 from magasins where code = 'IBOS';

-- Catégories (reprises de votre onglet LISTES)
insert into categories (libelle) values
  ('A CLASSER'),
  ('ACHATS MARCHANDISES / FOURNISSEURS VAPE & CONSOMMABLES'),
  ('ASSURANCES'),
  ('AVANTAGES SALARIES - TITRES RESTAURANT'),
  ('BANQUE / COMMISSIONS / TPE'),
  ('CARTES CADEAUX / DEPENSE EXCEPTIONNELLE A VERIFIER'),
  ('CHARGES SOCIALES / URSSAF'),
  ('COMPTABILITE / SOCIAL'),
  ('DEPENSE EXCEPTIONNELLE A VERIFIER'),
  ('Dons / mécénat / divers non opérationnel'),
  ('Déplacements / carburant / repas'),
  ('ENTRETIEN ANNUEL CLIMATISATION'),
  ('IMPOTS / TAXES'),
  ('LOYERS / CHARGES GALERIES COMMERCIALES'),
  ('Leasing / location matériel'),
  ('Matériel / fournitures / équipement'),
  ('RECETTES - Aides / remboursements'),
  ('RECETTES - Aides apprentis'),
  ('RECETTES - Autres crédits à vérifier'),
  ('RECETTES - Cartes bancaires'),
  ('RECETTES - Espèces déposées'),
  ('RECETTES - Remboursements / avoirs'),
  ('REMBOURSEMENTS EMPRUNTS / CREDIT'),
  ('REMUNERATION DIRIGEANT'),
  ('SALAIRES NETS'),
  ('Sécurité / télésurveillance'),
  ('EDF / INTERNET / LOGICIELS'),
  ('TRAVAUX / ENTRETIEN MAGASINS'),
  ('VEHICULES SOCIETE'),
  ('Impôts / TVA / IS'),
  ('À catégoriser / à confirmer');

-- Collaborateurs (reprise de votre onglet COLLABORATEURS)
insert into collaborateurs (nom, affectation, poste, statut, date_entree, actif, commentaire) values
  ('Anthony', 'PAU', 'Directeur adjoint', 'Cadre', '2017-02-06', true, null),
  ('Julien', 'PAU', 'Vendeur', 'Employé', '2021-10-04', true, 'Promotion possible responsable'),
  ('Axel', 'TARBES', 'Responsable de magasin', 'Employé', '2024-02-01', true, 'Référence salaire responsable'),
  ('Pauline', 'IBOS', 'Directeur adjoint', 'Cadre', null, true, null),
  ('Téa', 'PAU', 'Vendeur', 'Employé', null, true, null),
  ('Margau', 'PAU', 'Vendeur', 'Employé', null, true, null),
  ('Matisse', 'PAU', 'Apprenti', 'Apprenti', null, true, null),
  ('Brayan', 'IBOS', 'Vendeur', 'Employé', null, true, null),
  ('Clara', 'IBOS', 'Vendeur', 'Employé', null, true, null),
  ('Charlotte', 'IBOS', 'Vendeur', 'Employé', null, true, null),
  ('Flavio', 'IBOS', 'Apprenti', 'Apprenti', null, true, null),
  ('Mathieu', 'TARBES', 'Vendeur', 'Employé', null, true, null),
  ('Marina', 'TARBES', 'Vendeur', 'Employé', null, true, null),
  ('Marc', 'DIRIGEANT', 'Dirigeant', 'Dirigeant', null, true, null),
  ('Edwige', 'COMMUN', 'Administratif', 'Employé', null, true, null);

-- Règles de catégorisation (reprises de votre dictionnaire)
insert into regles_categorisation (mot_cle, categorie_id, affectation, priorite, confiance, commentaire)
select v.mot_cle, c.id, v.affectation, v.priorite, v.confiance, v.commentaire
from (values
  ('KMLS', 'ACHATS MARCHANDISES / FOURNISSEURS VAPE & CONSOMMABLES', 'COMMUN', 1, 100, 'Fournisseur vape'),
  ('Kumulus', 'ACHATS MARCHANDISES / FOURNISSEURS VAPE & CONSOMMABLES', 'COMMUN', 1, 100, 'Fournisseur vape'),
  ('Cumulus', 'ACHATS MARCHANDISES / FOURNISSEURS VAPE & CONSOMMABLES', 'COMMUN', 1, 100, 'Fournisseur vape'),
  ('Cloud Vapor', 'ACHATS MARCHANDISES / FOURNISSEURS VAPE & CONSOMMABLES', 'COMMUN', 1, 100, 'Fournisseur vape'),
  ('Curieux', 'ACHATS MARCHANDISES / FOURNISSEURS VAPE & CONSOMMABLES', 'COMMUN', 1, 100, 'Fournisseur vape'),
  ('Levest', 'ACHATS MARCHANDISES / FOURNISSEURS VAPE & CONSOMMABLES', 'COMMUN', 1, 100, 'Fournisseur vape'),
  ('Yaalom', 'ACHATS MARCHANDISES / FOURNISSEURS VAPE & CONSOMMABLES', 'COMMUN', 1, 100, 'Fournisseur vape'),
  ('La Distribution', 'ACHATS MARCHANDISES / FOURNISSEURS VAPE & CONSOMMABLES', 'COMMUN', 1, 100, 'Fournisseur vape'),
  ('Savourea', 'ACHATS MARCHANDISES / FOURNISSEURS VAPE & CONSOMMABLES', 'COMMUN', 1, 100, 'Fournisseur vape'),
  ('E-Tasty', 'ACHATS MARCHANDISES / FOURNISSEURS VAPE & CONSOMMABLES', 'COMMUN', 1, 100, 'Fournisseur vape'),
  ('ADNS', 'ACHATS MARCHANDISES / FOURNISSEURS VAPE & CONSOMMABLES', 'COMMUN', 1, 100, 'Fournisseur/consommables'),
  ('RETIF', 'ACHATS MARCHANDISES / FOURNISSEURS VAPE & CONSOMMABLES', 'COMMUN', 1, 100, 'Sacs, papier, rouleaux CB'),
  ('Swile', 'AVANTAGES SALARIES - TITRES RESTAURANT', 'COMMUN', 1, 100, 'Titres restaurant'),
  ('VOLKSWAGEN BANK', 'VEHICULES SOCIETE', 'COMMUN', 1, 100, 'Véhicules société'),
  ('Mercedes Benz', 'VEHICULES SOCIETE', 'COMMUN', 1, 100, 'Ancien véhicule'),
  ('Bnp Paribas Lease', 'Leasing / location matériel', 'COMMUN', 1, 100, 'Location matériel'),
  ('Grenke', 'Leasing / location matériel', 'COMMUN', 1, 100, 'Location matériel'),
  ('Leasecom', 'Leasing / location matériel', 'COMMUN', 1, 100, 'Location matériel'),
  ('Frais virement', 'BANQUE / COMMISSIONS / TPE', 'COMMUN', 1, 100, 'Frais bancaires'),
  ('Commission vente', 'BANQUE / COMMISSIONS / TPE', 'COMMUN', 1, 100, 'Commission CB'),
  ('Location équipement de paiement', 'BANQUE / COMMISSIONS / TPE', 'COMMUN', 1, 100, 'TPE'),
  ('Eccentive', 'COMPTABILITE / SOCIAL', 'COMMUN', 1, 100, 'Expert-comptable / social'),
  ('Securitas', 'Sécurité / télésurveillance', 'COMMUN', 1, 100, 'Télésurveillance'),
  ('Gueydon', 'TRAVAUX / ENTRETIEN MAGASINS', 'PAU', 1, 100, 'Electricien Pau'),
  ('Sepco', 'ENTRETIEN ANNUEL CLIMATISATION', 'COMMUN', 1, 100, 'Climatisation'),
  ('URSSAF', 'CHARGES SOCIALES / URSSAF', 'COMMUN', 1, 100, 'Charges sociales'),
  ('DGFIP', 'IMPOTS / TAXES', 'COMMUN', 1, 100, 'TVA / IS / taxes'),
  ('Prlv Ibos', 'LOYERS / CHARGES GALERIES COMMERCIALES', 'IBOS', 1, 100, 'Loyer Ibos'),
  ('Unicampus', 'LOYERS / CHARGES GALERIES COMMERCIALES', 'PAU', 1, 100, 'Loyer Pau'),
  ('Ormeaudis', 'LOYERS / CHARGES GALERIES COMMERCIALES', 'TARBES', 1, 100, 'Loyer Tarbes'),
  ('GIE Méridien', 'LOYERS / CHARGES GALERIES COMMERCIALES', 'IBOS', 1, 100, 'GIE galerie Ibos'),
  ('Remise Carte', 'RECETTES - Cartes bancaires', 'COMMUN', 1, 100, 'Encaissements CB'),
  ('Versement', 'RECETTES - Espèces déposées', 'COMMUN', 2, 100, 'Dépôts espèces'),
  ('Aide UniqueApprenti', 'RECETTES - Aides apprentis', 'COMMUN', 1, 100, 'Aide apprentis'),
  ('Crédit Agricole', 'BANQUE / COMMISSIONS / TPE', 'COMMUN', 2, 90, 'Frais bancaires / banque'),
  ('Frais', 'BANQUE / COMMISSIONS / TPE', 'COMMUN', 3, 70, 'Mot-clé générique, à contrôler'),
  ('TVA', 'Impôts / TVA / IS', 'COMMUN', 2, 90, 'TVA'),
  ('Salaire gerant', 'REMUNERATION DIRIGEANT', 'DIRIGEANT', 1, 100, 'Rémunération dirigeant')
) as v(mot_cle, categorie_libelle, affectation, priorite, confiance, commentaire)
join categories c on c.libelle = v.categorie_libelle;

-- ======================================================================
-- FIN DU SCRIPT
-- ======================================================================
