-- ======================================================================
-- GEM.VAP PILOTAGE — Correction : l'historique bloquait certaines
-- modifications sur ca_journalier et regles_categorisation
-- À coller dans Supabase > SQL Editor > New query > Run
-- ======================================================================

-- Fonction générique (sans référence à "etat", qui n'existe pas partout)
create or replace function enregistrer_historique_generique()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    insert into historique_modifications(table_cible, ligne_id, action, nouvelle_valeur, utilisateur_id)
    values (tg_table_name, new.id, 'creation', to_jsonb(new), auth.uid());
    return new;
  elsif (tg_op = 'UPDATE') then
    insert into historique_modifications(table_cible, ligne_id, action, ancienne_valeur, nouvelle_valeur, utilisateur_id)
    values (tg_table_name, new.id, 'modification', to_jsonb(old), to_jsonb(new), auth.uid());
    return new;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Fonction spécifique aux opérations bancaires (qui, elle, a bien une colonne "etat")
create or replace function enregistrer_historique_operations()
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

-- Réattacher les bons déclencheurs sur les bonnes tables
drop trigger if exists trg_historique_ca on ca_journalier;
create trigger trg_historique_ca
  after insert or update on ca_journalier
  for each row execute function enregistrer_historique_generique();

drop trigger if exists trg_historique_regles on regles_categorisation;
create trigger trg_historique_regles
  after insert or update on regles_categorisation
  for each row execute function enregistrer_historique_generique();

drop trigger if exists trg_historique_banque on operations_bancaires;
create trigger trg_historique_banque
  after insert or update on operations_bancaires
  for each row execute function enregistrer_historique_operations();

-- ======================================================================
-- FIN
-- ======================================================================
