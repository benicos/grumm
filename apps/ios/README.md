# Grumm iOS

Première version mobile native de test pour iPhone, construite avec Expo et React Native.

## Choix technique

L'app iOS est isolée dans `apps/ios` pour ne pas casser le site Next.js existant. Elle ne charge pas Grumm dans une WebView : elle utilise ses propres écrans React Native, un client Supabase mobile singleton et les mêmes tables/RPC que le web.

Comparaison rapide :

- PWA installable : très rapide, mais expérience iOS limitée et moins adaptée à une publication App Store.
- Capacitor : utile pour emballer le site actuel, mais risque de garder une sensation de site web dans une app.
- Expo / React Native : meilleur compromis pour tester vite sur iPhone, utiliser le partage natif et garder une base saine pour l'App Store.

## Prérequis

- Node.js et npm.
- Un projet Supabase Grumm existant.
- Pour le simulateur iOS : macOS avec Xcode.
- Pour iPhone physique sans Mac : l'app Expo Go depuis l'App Store.

## Configuration

Depuis ce dossier :

```bash
cp .env.example .env
```

Renseigner :

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_SITE_URL=https://grumm.fr
```

La clé `EXPO_PUBLIC_SUPABASE_ANON_KEY` est la clé publique Supabase prévue pour les clients. Ne jamais placer de clé service role dans cette app.

## Installation

```bash
cd apps/ios
npm install
```

## Lancer l'app

Serveur Expo :

```bash
npm start
```

Simulateur iOS :

```bash
npm run ios
```

IPhone physique :

1. Lancer `npm start`.
2. Ouvrir Expo Go sur l'iPhone.
3. Scanner le QR code affiché par Expo.

## Fonctionnalités incluses

- Feed vertical sombre et immersif.
- Cartes de faits avec catégorie, titre, contenu, à retenir et source.
- Like, sauvegarde et tracking de lecture via Supabase.
- Partage natif iOS du fait avec lien public.
- Authentification Supabase email/mot de passe.
- Onglet Enregistrés.
- Profil avec statistiques simples : lectures, likes, sauvegardes, objectifs.
- États de chargement, erreurs et absence de contenu.
- Respect des safe areas iOS.

## Vers l'App Store

Prochaines étapes recommandées :

- Ajouter des icônes et splash screens Grumm définitifs.
- Ajouter les deep links nécessaires.
- Renforcer les tests sur iPhone réel.
- Préparer `eas.json` et utiliser EAS Build.
- Générer un build interne TestFlight.
- Revoir les textes légaux, confidentialité et suivi analytics avant soumission.
