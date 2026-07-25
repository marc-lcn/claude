# Changelog — GEM.VAP Pilotage

Toutes les évolutions notables de l'application sont listées ici, de la plus récente à la plus ancienne.

Ce fichier suit une convention simple :
- **MAJEURE.MINEURE.CORRECTIF** (ex. `1.0.0`)
- **CORRECTIF** : correction de bug, sans nouvelle fonctionnalité.
- **MINEURE** : nouvelle fonctionnalité, compatible avec l'existant.
- **MAJEURE** : évolution structurante ou rupture de compatibilité.

La version affichée dans l'application (section "À propos") et le numéro utilisé pour la détection des mises à jour proviennent uniquement de `version.json` — ce fichier ne fait que documenter, en langage clair, ce que chaque version a changé.

---

## [1.0.0] — 2026-07-25

Première version stable de GEM.VAP Pilotage.

### Sécurité
- Sécurisation des policies RLS de la table `profils` (suppression d'une possibilité d'auto-élévation de privilège).
- Protection contre les failles XSS sur l'ensemble des contenus externes affichés (libellés bancaires, noms de fichiers, noms de salariés/magasins/catégories, résultats de recherche).

### Fiabilité
- Import bancaire rendu idempotent : réimporter plusieurs fois le même relevé ne crée plus de doublon.
- Protection anti-doublons appliquée au niveau de la base de données (pas seulement côté application).
- Rapport clair après chaque import : nombre d'opérations analysées, nouvelles, doublons ignorés, anomalies détectées.

### Traçabilité
- Création d'un journal d'audit métier, append-only : trace qui a fait quoi, quand, sur quel élément, pour les actions ayant un réel impact (imports, créations/modifications/suppressions de salariés, catégories, règles, magasins, corrections tardives du CA, modifications d'opérations déjà validées).

### Infrastructure
- Dépôt GitHub privé dédié.
- Déploiement automatique depuis GitHub vers Netlify à chaque mise à jour de la branche `main`.
- Mise en place du versionnement de l'application (`VERSION`, `version.json`), d'un mécanisme de détection des mises à jour dans la PWA, et de cette documentation.
