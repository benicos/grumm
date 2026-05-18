# Velora

Velora est une application Next.js App Router avec Tailwind CSS et Supabase
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

Appliquer les migrations SQL dans l'ordre logique :

1. `supabase/schema.sql` pour une base neuve.
2. `supabase/velora_urls_progress.sql` si la base existait avant les slugs et la
   progression.
3. `supabase/velora_seed_20_more_facts.sql` pour enrichir les contenus.
4. `supabase/velora_roles_profile_admin.sql` pour les rôles, policies admin,
   reset des vues et progression enrichie.
5. `supabase/velora_role_trigger_fix.sql` si une base existante a déjà le
   trigger de protection des rôles et bloque les migrations ou les updates
   administrateur.

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
