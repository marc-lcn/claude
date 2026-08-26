# Changelog — Jéthro

Toutes les évolutions notables de l'application sont listées ici, de la plus récente à la plus ancienne.

Ce fichier suit une convention simple :
- **MAJEURE.MINEURE.CORRECTIF** (ex. `1.0.0`)
- **CORRECTIF** : correction de bug, sans nouvelle fonctionnalité.
- **MINEURE** : nouvelle fonctionnalité, compatible avec l'existant.
- **MAJEURE** : évolution structurante ou rupture de compatibilité.

La version affichée dans l'application (section "À propos") et le numéro utilisé pour la détection des mises à jour proviennent uniquement de `version.json` — ce fichier ne fait que documenter, en langage clair, ce que chaque version a changé.

---

## [1.4.0] — 2026-08-26 — Jéthro Advisor

Nouvel assistant de questions métier, entièrement **déterministe** (aucune IA/LLM externe, aucune donnée transmise à un service tiers) : Jéthro répond uniquement à partir des données déjà présentes dans l'application, via un moteur de reconnaissance de questions par mots-clés et des requêtes Supabase prédéfinies.

### Jéthro Advisor
- Nouvelle page « Jéthro Advisor » : question libre au clavier ou suggestions rapides, historique de conversation conservé uniquement le temps de la session (jamais persisté).
- Intentions reconnues : chiffre d'affaires, tickets, panier moyen, meilleur magasin, magasin en retard, opérations à contrôler, catégories de dépenses, meilleur vendeur, et un résumé « Que dois-je regarder aujourd'hui ? ».
- Reconnaissance par spécificité : comme pour les règles de catégorisation bancaire, ce n'est jamais la première correspondance qui l'emporte mais la plus précise (ex. « le chiffre d'affaires du meilleur vendeur » est bien reconnu comme une question sur le vendeur, pas sur le CA générique).
- Filtres additionnels reconnus dans la question : un magasin (Pau/Ibos/Tarbes/Internet), une comparaison à l'an dernier ou au mois dernier.
- Analyse de cause prudente en cas de recul commercial (fréquentation ou panier moyen), toujours formulée au conditionnel (« semble lié à », « les données suggèrent »), jamais présentée comme une certitude, et jamais étendue à des causes non mesurables (météo, concurrence, saisonnalité...).
- Aucun texte saisi par l'utilisateur n'est jamais transformé en requête SQL : seule une intention reconnue, parmi une liste fermée, déclenche une requête Supabase déjà écrite à l'avance.
- Un résultat provenant d'une requête en échec n'est jamais présenté comme une vraie valeur (jamais de faux zéro) : Advisor répond alors explicitement qu'il ne peut pas vérifier l'information pour le moment.
- Réutilise, sans le modifier, l'algorithme de jour comparable déjà utilisé par le tableau de bord (extrait dans une fonction commune `chargerPerformanceEntreprise()`, sans changement de comportement du tableau de bord lui-même).

### Autres améliorations
- Opérations à contrôler : filtre par catégorie, pour n'afficher par exemple que les achats de marchandises.
- Analyse par magasin : répartition proportionnelle au chiffre d'affaires des dépenses/revenus communs (COMMUN/DIRIGEANT) sur les 4 magasins, avec un nouveau graphique de proportions.
- Catégorisation bancaire : la règle la plus spécifique l'emporte désormais toujours (correction d'une ambiguïté possible entre deux mots-clés dont l'un contient l'autre), et nouvel outil de correction rétroactive des opérations déjà validées avec un mauvais mot-clé.

---

## [1.3.0] — 2026-07-26 — Administration, sauvegarde et fiabilité

Nouveau centre d'administration, réservé au dirigeant, pour sécuriser les données de configuration (règles, catégories) et surveiller l'état général de l'application.

### Centre d'administration
- Nouvelle entrée de navigation « Administration », visible uniquement pour un profil dirigeant actif (protégée par les policies RLS existantes, pas seulement masquée côté interface).
- **Vue d'ensemble** : compteurs (règles actives/archivées, catégories, opérations bancaires et à contrôler, utilisateurs actifs, date de la dernière sauvegarde, état de la connexion), chaque indicateur affichant honnêtement « Indisponible » en cas d'échec plutôt qu'une valeur inventée.
- **Sauvegardes** : export CSV des règles actives, des règles archivées et des catégories ; export JSON versionné d'une sauvegarde complète (règles, règles archivées, catégories, magasins, exercices, salariés — les tables transactionnelles volumineuses restent volontairement hors périmètre de cette version).
- **Import sécurisé** : lecture d'un fichier CSV ou JSON, prévisualisation (lignes valides/ignorées/en erreur), détection des doublons sur des critères métier (mot-clé, catégorie, affectation), confirmation explicite avant toute écriture. N'ajoute jamais que des éléments nouveaux : aucune suppression ni modification automatique des données existantes.
- **Règles archivées** : consultation, recherche, filtre par catégorie, pagination et restauration unitaire d'une règle supprimée (via la fonction sécurisée mise en place au lot précédent) — l'archive reste toujours conservée après restauration.
- **Journal d'activité** : consultation filtrable du journal d'audit existant (recherche, filtre par type d'événement, détails techniques repliés).
- **Diagnostic** : contrôles d'intégrité strictement en lecture (connexion, rôle, cohérence des règles et catégories, doublons) — n'effectue jamais de correction automatique.

### Sécurité
- Nouvelle fonction `compter_profils_actifs()` : renvoie uniquement un nombre, jamais une donnée individuelle, réservée au rôle authentifié.
- Extension mineure et additive du journal d'audit (3 nouveaux types d'événements), sans toucher à l'historique existant.

---

## [1.2.0] — 2026-07-26

L'application s'appelle désormais **Jéthro**. GEM.VAP reste bien sûr l'entreprise pilotée par l'application — seul le nom du logiciel change.

### Identité
- Nouveau nom, nouveau logo (symbole, sans lien avec le nom d'origine), nouvelles icônes PWA.
- Signature : « Jéthro — Le conseil du dirigeant ».

### Tableau de bord
- Refonte complète du tableau de bord en véritable cockpit : ce qu'il faut savoir ou faire aujourd'hui, en un coup d'œil.
- Chiffres clés du mois (CA HT, tickets, panier moyen, opérations à contrôler), avec accès direct aux pages concernées.
- Performance par magasin (Pau, Ibos, Tarbes, Internet) sous forme d'onglets.
- Comparaisons avec les jours réellement comparables de l'historique (même jour de semaine, mois précédent et année précédente), affichées uniquement quand elles sont fiables — jamais de comparaison approximative présentée comme certaine.
- Cumul du mois en cours comparé aux mêmes périodes des mois de référence.
- Résumé intelligent : quelques phrases en langage courant plutôt qu'une accumulation de chiffres.
- Mini-graphiques discrets (tendance du CA, répartition par magasin), sans bibliothèque externe.

### Divers
- Poursuite du même mécanisme de mise à jour de la PWA introduit en 1.0.0.

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
