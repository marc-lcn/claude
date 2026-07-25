# GEM.VAP Pilotage

Application de pilotage financier pour la chaîne de boutiques GEM.VAP (Pau, Ibos, Tarbes, Internet) : saisie du chiffre d'affaires, import et catégorisation des relevés bancaires, suivi des salariés et de leurs bulletins de paie, suivi des ventes par vendeur, analyse par magasin, et journal d'audit des actions importantes.

C'est une **Progressive Web App (PWA)** : elle s'utilise dans un navigateur classique, ou peut être installée sur téléphone/ordinateur pour un accès en un clic, sans passer par un store d'applications.

---

## Architecture

L'application est volontairement simple : **pas de framework, pas d'étape de build, pas de serveur applicatif**. Tout est statique.

| Fichier / dossier | Rôle |
|---|---|
| `index.html` | L'application entière : structure, style et logique JavaScript, dans un seul fichier. |
| `manifest.json` | Déclaration PWA (nom, icônes, couleurs, mode d'affichage). |
| `sw.js` | Service worker : mise en cache pour un fonctionnement dégradé hors-ligne, stratégie "réseau d'abord". |
| `icon-192.png`, `icon-512.png` | Icônes de l'application installée. |
| `VERSION` | Miroir texte du numéro de version courant, pour référence humaine (voir plus bas — **n'est jamais lu par l'application**). |
| `version.json` | Source unique lue par l'application pour afficher la version et détecter une mise à jour (voir plus bas). |
| `CHANGELOG.md` | Historique des évolutions, version par version. |
| `netlify.toml` | Configuration du déploiement et des en-têtes de cache. |
| `supabase-migrations/` | Scripts SQL, dans l'ordre d'exécution historique, décrivant toute l'évolution de la base de données. |

**Aucune donnée métier n'est stockée dans ce dépôt.** Toutes les données (opérations bancaires, salariés, CA, journal d'audit...) vivent dans Supabase, pas dans le code.

---

## Rôle de Supabase

[Supabase](https://supabase.com) fournit la base de données (PostgreSQL) et l'authentification. L'application s'y connecte directement depuis le navigateur avec une clé publique ("anon key"), sans serveur intermédiaire. La sécurité des données repose sur les **policies RLS (Row Level Security)** définies dans les migrations SQL, pas sur le code JavaScript : même en lisant le code source, personne ne peut accéder aux données sans passer les vérifications posées côté base.

Les scripts dans `supabase-migrations/` doivent être exécutés **manuellement**, dans Supabase (SQL Editor), un par un et dans l'ordre numérique. Ils ne sont jamais exécutés automatiquement par le déploiement du site.

---

## Prérequis

- Un projet Supabase existant (URL + clé anon déjà configurées dans `index.html`).
- Un compte GitHub avec accès au dépôt privé du projet.
- Un compte Netlify relié à ce dépôt GitHub.
- Aucun outil de développement n'est nécessaire pour publier une mise à jour simple (pas de Node.js, pas de build local) — un navigateur et GitHub Desktop suffisent.

---

## Déploiement : GitHub → Netlify

Le déploiement est **automatique** :

```
Modification des fichiers
→ commit dans GitHub Desktop
→ push vers la branche main
→ Netlify détecte le push et republie automatiquement le site
```

Netlify republie le contenu du dépôt tel quel (site statique, `publish = "."` dans `netlify.toml`) — il n'y a rien à construire, donc rien qui puisse échouer à la compilation.

### Procédure pour publier une mise à jour

1. Le code est modifié (par Claude ou manuellement).
2. Vérifier que l'application fonctionne comme attendu (test en local en ouvrant `index.html`, ou sur une preview Netlify).
3. Mettre à jour ensemble, dans le même commit :
   - `VERSION` (le numéro seul) ;
   - `version.json` (`version`, `date`, `highlights`) ;
   - une nouvelle entrée en tête de `CHANGELOG.md`.
4. Commit dans GitHub Desktop, avec un message clair.
5. Push vers `main`.
6. Netlify republie automatiquement (suivre l'avancement dans le tableau de bord Netlify).
7. Rouvrir l'application : au premier plan, elle détecte automatiquement la nouvelle version et propose de mettre à jour (voir section suivante).

---

## Versionnement et mise à jour de la PWA

### Convention de version

`MAJEURE.MINEURE.CORRECTIF`, par exemple `1.0.0` :

- **CORRECTIF** (`1.0.1`) : correction de bug, sans nouvelle fonctionnalité.
- **MINEURE** (`1.1.0`) : nouvelle fonctionnalité, compatible avec l'existant.
- **MAJEURE** (`2.0.0`) : évolution structurante ou rupture de compatibilité.

### Source unique de vérité — important

> **`version.json` est l'unique fichier lu par l'application à l'exécution.** C'est lui qui alimente l'affichage de la version, de la date, des nouveautés dans la section "À propos", et qui sert de référence pour détecter qu'une nouvelle version a été déployée.
>
> **Le fichier `VERSION` n'est qu'un miroir texte, à usage humain** (lecture rapide dans un terminal ou un explorateur de fichiers, référence dans la documentation). **Il n'est jamais lu par le code de l'application.** Un oubli de mise à jour sur ce fichier seul n'a donc aucun impact fonctionnel — mais il doit toujours être tenu à jour en même temps que `version.json`, par discipline (voir la procédure de publication ci-dessus).

### Comment fonctionne la détection de mise à jour

L'application vérifie si une nouvelle version a été déployée :
- au chargement de l'application ;
- lorsqu'on revient dessus après l'avoir laissée en arrière-plan (changement d'onglet, PWA remise au premier plan sur téléphone) ;
- manuellement, via le bouton "Vérifier les mises à jour" dans Paramètres → À propos.

**Il n'y a volontairement aucune vérification automatique périodique** (pas de sondage toutes les X minutes), pour éviter des requêtes réseau inutiles.

Si une version différente est détectée, un message apparaît avec le numéro de la nouvelle version et ses principales nouveautés, avec deux choix : **Mettre à jour** (rechargement immédiat de l'application, une seule fois) ou **Plus tard** (le message disparaît pour cette session ; il ne réapparaît pas pour la même version, mais réapparaîtra si une version encore plus récente est détectée par la suite).

### Retour arrière (rollback)

**Revenir à une version antérieure du code** ne nécessite aucune action Git compliquée :
1. Ouvrir le tableau de bord Netlify du site.
2. Dans l'historique des déploiements ("Deploys"), retrouver le déploiement correspondant à la version souhaitée.
3. Cliquer sur "Publish deploy" (ou équivalent) pour le republier tel quel.

Alternative en ligne de commande : `git revert` du ou des commits concernés, puis push — Netlify republiera automatiquement.

**Important — restaurer le code n'est PAS restaurer les données.** Revenir à une version antérieure du site (`index.html`, etc.) ne touche jamais aux données stockées dans Supabase (opérations bancaires, salariés, CA saisi, journal d'audit...). Ces deux éléments sont totalement indépendants :
- **Code** → géré par Git/Netlify, réversible en un clic.
- **Données** → gérées par Supabase, réversibles uniquement via une restauration de base de données côté Supabase (fonctionnalité de sauvegarde/restauration du projet, à traiter séparément — voir le Lot F du projet, consacré à la sauvegarde).

Revenir en arrière sur le code n'annule donc jamais une migration SQL déjà exécutée, ni les données saisies depuis.

---

## Sécurité

- Aucun secret, mot de passe ou clé privée n'est stocké dans ce dépôt. La clé Supabase présente dans `index.html` est une clé publique ("anon key"), prévue pour être visible côté client — la sécurité réelle des données repose sur les policies RLS définies en base, pas sur le secret de cette clé.
- L'accès à l'application est réservé aux comptes explicitement activés dans la table `profils` (voir `supabase-migrations/25_securisation_profils.sql`).
