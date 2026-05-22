# Grumm

Grumm est une application Next.js App Router avec Tailwind CSS et Supabase
pour l'authentification, les données, la progression de lecture et les rôles.

## Développement

```bash
npm install
npm run dev
```

Variables attendues :

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
```

Option de debug :

```bash
NEXT_PUBLIC_ERROR_MODE=debug
```

En développement, les erreurs affichent le contexte utile. En production, les
messages visibles restent génériques et les détails techniques ne doivent pas
être exposés à l'utilisateur.

## Workflow Git / Vercel

Organisation recommandée :

- `main` = production stable.
- `dev` = développement et previews.
- Développer sur `dev`.
- Lancer `npm run lint` puis `npm run build`.
- Merger `dev` vers `main` uniquement quand la version est stable.
- Configurer Vercel avec `main` comme Production Branch.
- Laisser Vercel créer les Preview Deployments depuis `dev` et les branches de
  travail.

Vercel ne se configure pas entièrement depuis ce dépôt sans accès au projet
Vercel. À vérifier dans le dashboard Vercel :

- Project Settings -> Git -> Production Branch = `main`.
- Preview deployments activés pour les branches non production.
- Variables Supabase présentes dans Production et Preview.
- `NEXT_PUBLIC_SITE_URL` défini sur le domaine public en production.

## Supabase

Les fichiers canoniques sont désormais consolidés :

1. `supabase/schema.sql` contient le schéma complet : tables, types, contraintes,
   index, RLS, policies, fonctions et triggers.
2. `supabase/seed.sql` contient les données initiales utiles : thèmes, faits de
   démonstration et contenus enrichis.

Les anciens fragments SQL ont été déplacés dans `supabase/archive/` pour garder
une trace de migration, mais ils ne sont plus le chemin recommandé pour une base
neuve.

`supabase/schema.sql` est aussi relancable sur une base Grumm partiellement
existante : les ajouts utilisent des formes idempotentes et conservent les
donnees. Les conflits de types externes ou de lignes orphelines qui exigent une
operation destructive restent signales en commentaire SQL pour revue manuelle.

Premier administrateur :

```sql
update public.profiles
set role = 'administrateur'
where id = 'UUID_DU_PROFIL_ADMIN';
```

Cette opération doit être faite une seule fois depuis un contexte SQL Supabase
fiable. Un utilisateur normal ne peut pas s'attribuer lui-même ce rôle via
l'application.

## Vérifications avant merge

```bash
npm run lint
npm run build
```

Parcours critiques :

- `/discover`, `/explorer`, `/fact/[slug]`.
- `/profile` connecté et déconnecté.
- Édition pseudo, email, mot de passe et objectif quotidien.
- Reset des vues uniques.
- Badges et progression quotidienne.
- `/admin` avec membre, rédacteur et administrateur.
- Anciennes routes françaises, qui doivent rediriger proprement.

## Version iOS de test

Une première application iOS Expo/React Native est disponible dans `apps/ios`.
Elle réutilise Supabase et les mécaniques Grumm sans embarquer le site dans une
WebView.

Commandes principales :

```bash
cd apps/ios
npm install
npm start
```

Voir `apps/ios/README.md` pour la configuration Supabase, le test sur simulateur
iOS, le test sur iPhone physique avec Expo Go et les prochaines étapes App
Store.
