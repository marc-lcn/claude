# Spartan 365 — projet React + Capacitor

Ce dossier est un vrai projet Vite + React, prêt à être transformé en application
Android via Capacitor. Le design et les fonctionnalités sont strictement identiques
à la version testée dans Claude — seule la façon dont les données sont stockées a
changé (voir `src/lib/storage.js`).

## Arborescence

```
spartan365/
├── package.json           dépendances et scripts npm
├── vite.config.js         config du bundler (build web -> dist/)
├── capacitor.config.json  config Capacitor (nom, id, dossier web)
├── index.html             point d'entrée HTML
├── public/
│   └── favicon.svg        icône provisoire (à remplacer, voir plus bas)
├── src/
│   ├── main.jsx           monte l'app React + installe le stockage local
│   ├── App.jsx            toute l'application (Aujourd'hui, Planning, Séances,
│   │                      Progression, Profil) — inchangée par rapport à Claude
│   ├── data/
│   │   └── spartanData.js les 366 jours du programme, extraits de ton Excel
│   └── lib/
│       └── storage.js     remplace window.storage (Claude) par localStorage
└── android/                <- n'existe pas encore, généré à l'étape 4 ci-dessous
```

Il n'y a pas de `tsconfig.json` : le projet est en JavaScript pur (pas TypeScript),
ce qui évite une couche de configuration supplémentaire pour cette V1.

## Ce qui a changé par rapport à la version Claude

La seule adaptation technique : dans Claude, l'app enregistrait tes données via
`window.storage` (propre à l'environnement Claude). En dehors de Claude, cette
API n'existe pas. `src/lib/storage.js` la recrée à l'identique par-dessus
`localStorage`, qui fonctionne aussi bien dans un navigateur que dans la WebView
Android de Capacitor. Aucun autre fichier n'a été modifié : mêmes écrans, mêmes
calculs, mêmes textes.

---

## Étape 1 — Prérequis à installer sur ton ordinateur

- **Node.js** (version 18 ou plus) — https://nodejs.org (prends la version LTS)
- **Visual Studio Code** — https://code.visualstudio.com
- **Android Studio** — https://developer.android.com/studio (installe aussi le
  "Android SDK" et un émulateur si proposé pendant l'installation)
- Un **câble USB** pour relier ton téléphone à l'ordinateur (le plus simple pour
  installer l'APK directement)

## Étape 2 — Récupérer le projet et l'ouvrir

1. Télécharge le dossier `spartan365` complet sur ton ordinateur.
2. Ouvre VS Code.
3. Menu **Fichier → Ouvrir le dossier...** → sélectionne le dossier `spartan365`.
4. Ouvre un terminal intégré : menu **Terminal → Nouveau terminal**.

## Étape 3 — Installer les dépendances et tester dans le navigateur

Dans le terminal VS Code :

```bash
npm install
npm run dev
```

Une adresse du type `http://localhost:5173` s'affiche. Ouvre-la dans ton
navigateur : tu dois voir Spartan 365 fonctionner exactement comme dans Claude.
C'est le moment de vérifier que tout va bien avant de passer à Android.

Arrête le serveur avec `Ctrl+C` une fois la vérification faite.

## Étape 4 — Ajouter la plateforme Android

Toujours dans le terminal :

```bash
npm run build
npx cap add android
```

Cette commande crée le dossier `android/` (le vrai projet Android Studio) à
partir de `capacitor.config.json`. Elle ne se fait qu'**une seule fois** — tu ne
la relanceras pas pour les prochaines versions.

## Étape 5 — Ouvrir le projet Android et générer l'APK

```bash
npx cap sync android
npx cap open android
```

Cela ouvre Android Studio automatiquement sur le projet. La première ouverture
peut prendre plusieurs minutes (Gradle télécharge des composants). Attends que
la barre de progression en bas soit terminée.

Une fois Android Studio prêt :

1. Menu **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
2. Attends la fin du build (une notification "APK(s) generated successfully"
   apparaît en bas à droite).
3. Clique sur **locate** dans cette notification, ou trouve le fichier ici :
   `android/app/build/outputs/apk/debug/app-debug.apk`

C'est ce fichier `app-debug.apk` que tu vas installer sur ton téléphone.

## Étape 6 — Installer l'APK sur ton téléphone Android

**Option A — la plus simple : via le câble USB et Android Studio**

1. Active le mode développeur sur ton téléphone : *Paramètres → À propos du
   téléphone → tape 7 fois sur "Numéro de build"*.
2. *Paramètres → Options pour les développeurs* → active **Débogage USB**.
3. Connecte le téléphone à l'ordinateur en USB, accepte la demande
   d'autorisation qui apparaît sur l'écran du téléphone.
4. Dans Android Studio, ton téléphone apparaît dans la liste déroulante en haut
   (à côté du bouton ▶ vert). Sélectionne-le, puis clique sur ▶ **Run**.
5. L'app s'installe et s'ouvre automatiquement sur ton téléphone.

**Option B — transfert manuel du fichier APK**

1. Copie `app-debug.apk` sur ton téléphone (câble USB, Google Drive, etc.).
2. Sur le téléphone, ouvre le fichier depuis l'app Fichiers.
3. Android demande d'autoriser l'installation depuis cette source la première
   fois : accepte.
4. L'app s'installe comme n'importe quelle app.

**Avant d'installer, vérifie :**
- Que le téléphone a au moins quelques centaines de Mo d'espace libre.
- Que tu n'as **pas désinstallé** une version précédente de Spartan 365 avant
  d'installer la nouvelle (voir section suivante — c'est ce qui efface les
  données).

## Étape 7 — Développer la suite et mettre à jour l'app sans perdre tes données

Pour chaque nouvelle version (V1.1, V1.2, ...) :

```bash
npm run build
npx cap sync android
npx cap open android
```

Puis rebuild l'APK (étape 5) et réinstalle-le **par-dessus** l'ancienne version
(même méthode qu'à l'étape 6, sans désinstaller l'ancienne avant). Tant que :
- `appId` dans `capacitor.config.json` ne change pas (`app.spartan365.mobile`),
- tu ne désinstalles pas l'app entre deux versions,

...tes données (séances validées, XP, niveau, records, préférences, etc.)
restent intactes, car elles vivent dans le stockage local de l'app, pas dans le
fichier APK lui-même. C'est exactement pour ça que l'architecture de version des
données (mise en place précédemment) a de l'importance : si un jour la structure
d'une donnée doit changer, une migration s'exécute automatiquement à l'ouverture
plutôt que d'effacer quoi que ce soit.

## Icône de l'application

`public/favicon.svg` est une icône provisoire simple. Pour une vraie icône
Android (toutes les tailles, coins arrondis adaptatifs, etc.), l'outil standard
est :

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --android
```

à lancer avec une image source (ex. `assets/icon.png`, 1024×1024) une fois que
tu as une illustration définitive — pas nécessaire pour tester la V1.

## Sauvegarde cloud (plus tard)

`src/lib/storage.js` est le seul endroit qui touche au stockage. Le jour où tu
veux ajouter une vraie sauvegarde cloud, c'est ce fichier qu'on fait évoluer
(ou qu'on complète) — le reste de l'application n'a pas besoin de changer,
puisque tout passe déjà par cette couche unique.
