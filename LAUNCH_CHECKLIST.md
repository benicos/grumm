# Grumm. Launch Checklist

## Sécurité
- [ ] Vérifier que seules `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `NEXT_PUBLIC_SITE_URL` sont exposées côté client.
- [ ] Confirmer qu'aucune `service_role_key`, clé privée ou variable `sb_secret_` n'est déployée côté navigateur ou application iOS.
- [ ] Appliquer toutes les migrations Supabase en production, notamment la RPC `get_personalized_feed`.
- [ ] Vérifier les politiques RLS en production avec un compte anonyme, membre, rédacteur et administrateur.
- [ ] Tester que `/admin/**` refuse tout utilisateur non autorisé.

## Légal
- [ ] Compléter les placeholders de `/mentions-legales` : éditeur, adresse si nécessaire, hébergeur confirmé.
- [ ] Confirmer l'adresse de contact publique `contact@grumm.fr`.
- [ ] Relire la politique de confidentialité après configuration finale Supabase, Vercel et iOS.

## SEO
- [ ] Vérifier `NEXT_PUBLIC_SITE_URL=https://grumm.fr` en production.
- [ ] Contrôler `/sitemap.xml` après déploiement.
- [ ] Contrôler `/robots.txt` après déploiement.
- [ ] Vérifier que `/admin`, `/profil`, `/login`, `/register`, `/forgot-password` et `/reset-password` sont `noindex`.
- [ ] Vérifier les balises title/description des pages `/`, `/theme`, `/fait/[slug]`, `/a-propos`, `/politique-confidentialite` et `/mentions-legales`.

## Auth et Produit
- [ ] Inscription avec objectif/niveau.
- [ ] Connexion, déconnexion et restauration de session.
- [ ] Mot de passe oublié et changement de mot de passe.
- [ ] Lecture d'un fait, like, sauvegarde, partage et source.
- [ ] Progression quotidienne et quiz mémoire.
- [ ] Feed infini avec personnalisation et sans doublons rapides.

## Admin
- [ ] Créer, modifier, publier et supprimer un fait.
- [ ] Vérifier le workflow rédacteur : attente de validation et absence de publication directe non autorisée.
- [ ] Créer/modifier un thème, colorpicker et preview.
- [ ] Créer/modifier une question quiz.
- [ ] Vérifier le dashboard analytics et le panneau debug score.

## Performance
- [ ] Lancer `npm run build`.
- [ ] Lancer `npx tsc --noEmit -p apps/ios/tsconfig.json`.
- [ ] Vérifier les bundles côté Vercel après déploiement.
- [ ] Tester `/decouvrir` sur mobile avec une connexion lente.
- [ ] Surveiller les requêtes Supabase du feed et les temps de réponse de `get_personalized_feed`.

## Domaine et Déploiement
- [ ] Vérifier DNS `grumm.fr`.
- [ ] Vérifier HTTPS.
- [ ] Vérifier variables Vercel et Expo.
- [ ] Vérifier Supabase Auth redirect URLs.
- [ ] Vérifier emails Supabase Auth en production.
