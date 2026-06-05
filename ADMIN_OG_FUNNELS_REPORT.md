# ADMIN / OpenGraph / Funnels - Rapport Grumm

Date: 2026-06-05  
Mission: renforcer la protection serveur de l'administration, créer les OpenGraph globaux, structurer les funnels analytics produit.

## Résumé exécutif

- Protection serveur admin: implémentée dans `middleware.ts` avant rendu React. Les accès anonymes ou avec token invalide sont redirigés vers `/login?redirect=...`. Les utilisateurs connectés sans permission `admin.access` sont redirigés vers l'accueil. Les utilisateurs autorisés passent avec les mêmes règles de permissions que l'administration existante.
- OpenGraph global: images générées avec les APIs natives Next.js (`next/og`) pour les pages publiques principales. Les metadata utilisent maintenant des images 1200x630 pour les routes ciblées.
- Funnels analytics: événements ajoutés pour mesurer acquisition, activation, quiz, rétention et gamification. Les événements restent exclus de `/admin` et des comptes administrateurs via le provider existant.

Preuves techniques exécutées:

- `npm run lint`: OK.
- `npm run build`: OK après rédaction du rapport, avec 56 pages générées et les routes `opengraph-image` listées.
- Runtime local: `/admin` anonyme retourne `307` vers `/login?redirect=%2Fadmin`.
- Runtime local: `/quiz/opengraph-image` retourne `200`, `Content-Type: image/png`, taille de réponse `176472`.
- Runtime local: la home contient `https://grumm.fr/opengraph-image` dans ses metadata.

## Sécurité admin

### Statut

FAIT pour l'implémentation serveur et la preuve anonyme.  
PARTIEL pour les tests utilisateurs connectés/admin réels, faute de session Supabase de test disponible dans ce contexte local.

### Solution retenue

Le projet utilisait une session Supabase persistée côté navigateur, principalement invisible depuis le serveur. Pour permettre un blocage avant rendu React, un cookie miroir minimal a été ajouté:

- nom: `grumm_admin_access`;
- contenu: access token Supabase uniquement;
- durée: 1 heure;
- `SameSite=Lax`;
- `Secure` uniquement en HTTPS;
- aucun refresh token;
- aucune clé Supabase ou donnée sensible métier.

Le middleware lit ce cookie, vérifie le token via Supabase Auth, charge le profil, puis vérifie la permission `admin.access` en appliquant les permissions de la table `roles` ou les permissions système par défaut.

### Routes protégées

- `/admin`
- `/admin/*`
- toutes les sous-routes dynamiques admin, notamment:
  - `/admin/facts`
  - `/admin/facts/[id]`
  - `/admin/facts/[id]/edit`
  - `/admin/themes`
  - `/admin/users`
  - `/admin/roles`
  - `/admin/grades`
  - `/admin/quizzes`
  - `/admin/settings`

### Comportement

| Cas | Comportement |
| --- | --- |
| Utilisateur anonyme | Redirection serveur `307` vers `/login?redirect=/admin...` avant rendu React. |
| Token invalide ou expiré | Redirection serveur `307` vers `/login?redirect=/admin...` et suppression du cookie miroir. |
| Utilisateur connecté sans `admin.access` | Redirection serveur `307` vers `/?admin=forbidden`. |
| Utilisateur avec `admin.access` | Accès autorisé, puis protections client et RLS existantes conservées. |

### Fichiers modifiés

- `middleware.ts`
- `src/app/auth/AuthProvider.tsx`
- `src/lib/supabase/adminAuthCookie.ts`

### Résultat obtenu

- Le rendu React admin n'est plus la première barrière.
- Les flashs de contenu admin sont évités pour les accès anonymes et tokens invalides.
- Les protections RLS ne sont pas modifiées.
- La logique de rôle reste cohérente avec `canAccessAdmin` et `hasPermission`.

### Preuves techniques

- Runtime local `/admin` sans cookie: `307`, `Location: /login?redirect=%2Fadmin`.
- `npm run build`: le projet compile avec le middleware actif.
- `middleware.ts` vérifie `/admin` et `/admin/*` avant `NextResponse.next()`.

### Actions restantes

- Tester avec un compte non-admin réel et un compte admin réel sur l'environnement Supabase de staging/prod.
- Option future: remplacer le cookie miroir par une stratégie SSR officielle Supabase si le projet migre vers les helpers SSR dédiés.

## OpenGraph

### Statut

FAIT pour les pages demandées.

### Rapport de proposition

| Route | Titre proposé | Sous-titre proposé | Description proposée | Visuel proposé |
| --- | --- | --- | --- | --- |
| `/` | Grumm. | La culture qui se scrolle. | Des faits courts, mémorables et reliés pour nourrir ta culture chaque jour. | Fond sombre premium, reflets champagne/turquoise, branding Grumm. |
| `/decouvrir` | Découvrir | Le flux culturel | Fais défiler des faits courts, surprenants et faciles à retenir. | Fond sombre, accent turquoise, signal de flux culturel. |
| `/theme` | Explorer | Thèmes et univers | Explore les grands territoires de la culture et lance un flux dédié à tes sujets préférés. | Fond sombre, accent bleu, ton cartographie culturelle. |
| `/quiz` | Grumm Quiz | Mémorisation | Teste ta mémoire, révise tes faits lus et transforme tes découvertes en connaissances durables. | Fond sombre, accent violet, univers mémoire. |
| `/quiz/general` | Quiz général | Quiz rapide | Un quiz rapide pour tester ta culture générale et retenir les faits essentiels. | Fond sombre, accent jaune sobre, énergie quiz. |
| `/aujourdhui` | Aujourd’hui | Aujourd'hui dans l'Histoire | Retrouve les faits culturels liés à la date du jour et comprends ce qui s'est joué aujourd'hui. | Fond sombre, accent orange calme, rendez-vous éditorial. |
| `/contact` | Contact | Contact éditorial | Signaler une erreur, proposer un sujet ou échanger avec l'équipe Grumm. | Fond sombre, accent champagne, ton institutionnel. |

### Images créées

| Route | Créé | Titre | Description | Fichier généré | Metadata mise à jour |
| --- | --- | --- | --- | --- | --- |
| `/` | Oui | Grumm. | Des faits courts, mémorables et reliés pour nourrir ta culture chaque jour. | `src/app/opengraph-image.tsx` | `src/app/page.tsx` |
| `/decouvrir` | Oui | Découvrir | Fais défiler des faits courts, surprenants et faciles à retenir. | `src/app/decouvrir/opengraph-image.tsx` | `src/app/decouvrir/page.tsx` |
| `/theme` | Oui | Explorer | Explore les grands territoires de la culture et lance un flux dédié à tes sujets préférés. | `src/app/theme/opengraph-image.tsx` | `src/app/theme/page.tsx` |
| `/quiz` | Oui | Grumm Quiz | Teste ta mémoire, révise tes faits lus et transforme tes découvertes en connaissances durables. | `src/app/quiz/opengraph-image.tsx` | `src/app/quiz/page.tsx` |
| `/quiz/general` | Oui | Quiz général | Un quiz rapide pour tester ta culture générale et retenir les faits essentiels. | `src/app/quiz/general/opengraph-image.tsx` | `src/app/quiz/general/page.tsx` |
| `/aujourdhui` | Oui | Aujourd’hui | Retrouve les faits culturels liés à la date du jour et comprends ce qui s'est joué aujourd'hui. | `src/app/aujourdhui/opengraph-image.tsx` | `src/app/aujourdhui/page.tsx` |
| `/contact` | Oui | Contact | Signaler une erreur, proposer un sujet ou échanger avec l'équipe Grumm. | `src/app/contact/opengraph-image.tsx` | `src/app/contact/page.tsx` |

### Fichiers modifiés

- `src/lib/ogImage.tsx`
- `src/lib/serverMetadata.ts`
- `src/app/opengraph-image.tsx`
- `src/app/decouvrir/opengraph-image.tsx`
- `src/app/theme/opengraph-image.tsx`
- `src/app/quiz/opengraph-image.tsx`
- `src/app/quiz/general/opengraph-image.tsx`
- `src/app/aujourdhui/opengraph-image.tsx`
- `src/app/contact/opengraph-image.tsx`
- `src/app/page.tsx`
- `src/app/decouvrir/page.tsx`
- `src/app/theme/page.tsx`
- `src/app/quiz/page.tsx`
- `src/app/quiz/general/page.tsx`
- `src/app/aujourdhui/page.tsx`
- `src/app/contact/page.tsx`

### Résultat obtenu

- Les pages publiques principales ont une image OpenGraph 1200x630.
- Les metadata OpenGraph et Twitter cards utilisent les images quand elles sont fournies.
- Le rendu est généré par Next.js, sans asset manuel.

### Preuves techniques

- `npm run build`: routes générées:
  - `/opengraph-image`
  - `/decouvrir/opengraph-image`
  - `/theme/opengraph-image`
  - `/quiz/opengraph-image`
  - `/quiz/general/opengraph-image`
  - `/aujourdhui/opengraph-image`
  - `/contact/opengraph-image`
- Runtime local `/quiz/opengraph-image`: `200`, `image/png`.
- Runtime local home: metadata contient `https://grumm.fr/opengraph-image`.

### Actions restantes

- Vérifier visuellement les images dans un validateur social externe après déploiement.
- Créer éventuellement des OG spécifiques pour `/politique-confidentialite` et `/mentions-legales` si ces pages deviennent partagées.

## Funnels

### Statut

FAIT pour la collecte des événements web principaux.  
PARTIEL pour l'analyse dashboard, qui nécessite des requêtes d'agrégation admin supplémentaires.

### Tableau des funnels

| Funnel | Événements | Statut |
| --- | --- | --- |
| Principal | `homepage_view` → `discover_opened` → `first_fact_read` → `first_like` → `first_save` → `signup_completed` | FAIT côté collecte |
| Quiz | `quiz_page_view` → `quiz_started` → `quiz_question_answered` → `quiz_completed` | FAIT côté collecte web |
| Rétention | `signup_completed` → `returned_day_1` → `returned_day_7` → `returned_day_30` | FAIT côté collecte web avec jalons locaux |
| Gamification | `profile_opened` → `avatar_viewed` → `daily_goal_completed` → `grade_up` → `returned_next_day` | FAIT côté collecte, PARTIEL côté analyse |

### Événements existants avant cette mission

- `app_opened`
- `page_viewed`
- `category_opened`
- `search_used`
- `explorer_search`
- `explorer_search_no_result`
- `fact_view`
- `fact_viewed`
- `fact_swipe`
- `fact_read_completed`
- `fact_shared`
- `source_clicked`
- `fact_like`
- `fact_liked`
- `fact_save`
- `fact_saved`
- `daily_goal_completed`
- `profile_opened`
- `signup_completed`
- `login_completed`
- `admin_fact_created`
- `admin_fact_updated`

### Événements ajoutés

- `homepage_view`
- `discover_opened`
- `first_fact_read`
- `first_like`
- `first_save`
- `quiz_page_view`
- `quiz_started`
- `quiz_question_answered`
- `quiz_completed`
- `returned_day_1`
- `returned_day_7`
- `returned_day_30`
- `returned_next_day`
- `avatar_viewed`
- `grade_up`

### Fichiers modifiés

- `src/lib/analytics/web.ts`
- `src/app/components/AnalyticsProvider.tsx`
- `src/app/discover/FactFeed.tsx`
- `src/app/fact/[factSlug]/page.tsx`
- `src/app/quiz/general/QuizExperience.tsx`
- `src/app/quiz/memoire/MemoryChallengePage.tsx`
- `src/app/profile/page.tsx`

### Résultat obtenu

- Le funnel principal peut mesurer l'arrivée home, l'ouverture du flux, la première lecture, les premières interactions et l'inscription.
- Le funnel quiz mesure la page, le démarrage, les réponses et la complétion.
- La rétention D1/D7/D30 est préparée à partir de `user.created_at`, avec déduplication locale.
- La gamification mesure profil, avatar, objectif quotidien, grade atteint et retour lendemain.
- Les analytics restent batchés et exclus de `/admin`.

### Preuves techniques

- Les événements sont typés dans `AnalyticsEventName`.
- `trackAnalyticsEventOnce` déduplique les événements `first_*`, `avatar_viewed`, `grade_up`.
- `trackRetentionMilestones` émet les jalons D1/D7/D30 selon l'âge du compte.
- `AnalyticsProvider` continue d'exclure `/admin` et les profils `administrateur`.

### Actions restantes

- Étendre les mêmes événements quiz à l'application iOS si l'on veut une analyse cross-platform stricte.
- Ajouter des agrégations SQL/admin pour afficher les taux de conversion par étape.
- Ajouter un identifiant de campagne/UTM si Grumm lance des campagnes d'acquisition.

## Analytics dashboard futur

### Événements existants

Voir la liste "Événements existants avant cette mission".

### Événements ajoutés

Voir la liste "Événements ajoutés".

### Événements recommandés

- `cta_clicked` avec `cta_id` pour comparer les CTA home/theme/quiz.
- `theme_feed_opened` pour mesurer l'entrée par thème.
- `signup_started` pour mieux mesurer l'abandon avant création de compte.
- `quiz_abandoned` si une session reste commencée sans completion.
- `share_completed` si le partage natif confirme une action.

### Tableaux proposés

- Funnel principal: étapes, utilisateurs uniques, taux de passage, chute entre étapes.
- Funnel quiz: sessions démarrées, questions moyennes répondues, complétions, score moyen.
- Rétention: cohortes D1/D7/D30 par date d'inscription.
- Gamification: profils ouverts, avatars vus, objectifs validés, grades atteints.
- Recherches Explorer: termes populaires, recherches sans résultat, conversion vers flux.

### Graphiques proposés

- Courbe quotidienne `discover_opened`, `first_fact_read`, `signup_completed`.
- Bar chart de conversion funnel principal.
- Courbe de completion quiz et abandon par question.
- Cohortes de rétention D1/D7/D30.
- Distribution des grades atteints.

### Indicateurs clés proposés

- Taux `homepage_view → discover_opened`.
- Taux `discover_opened → first_fact_read`.
- Taux `first_fact_read → first_like` et `first_save`.
- Taux `first_fact_read → signup_completed`.
- Taux de completion quiz.
- Rétention D1/D7/D30.
- Taux d'objectif quotidien complété.
- Nombre de grades atteints par semaine.

## Fichiers modifiés

Liste exhaustive des fichiers modifiés par cette mission:

- `ADMIN_OG_FUNNELS_REPORT.md`
- `middleware.ts`
- `src/app/auth/AuthProvider.tsx`
- `src/lib/supabase/adminAuthCookie.ts`
- `src/lib/analytics/web.ts`
- `src/app/components/AnalyticsProvider.tsx`
- `src/app/discover/FactFeed.tsx`
- `src/app/fact/[factSlug]/page.tsx`
- `src/app/quiz/general/QuizExperience.tsx`
- `src/app/quiz/memoire/MemoryChallengePage.tsx`
- `src/app/profile/page.tsx`
- `src/lib/ogImage.tsx`
- `src/lib/serverMetadata.ts`
- `src/app/opengraph-image.tsx`
- `src/app/decouvrir/opengraph-image.tsx`
- `src/app/theme/opengraph-image.tsx`
- `src/app/quiz/opengraph-image.tsx`
- `src/app/quiz/general/opengraph-image.tsx`
- `src/app/aujourdhui/opengraph-image.tsx`
- `src/app/contact/opengraph-image.tsx`
- `src/app/page.tsx`
- `src/app/decouvrir/page.tsx`
- `src/app/theme/page.tsx`
- `src/app/quiz/page.tsx`
- `src/app/quiz/general/page.tsx`
- `src/app/aujourdhui/page.tsx`
- `src/app/contact/page.tsx`

Fichiers déjà modifiés avant cette mission et encore visibles dans le worktree:

- `README.md`
- `apps/ios/README.md`
- `apps/ios/src/components/FactShareStory.tsx`
- `apps/ios/src/config/app.ts`
- `next.config.ts`
- `src/app/admin/facts/[id]/edit/page.tsx`
- `src/app/admin/grades/[id]/edit/page.tsx`
- `src/app/admin/quizzes/[id]/edit/page.tsx`
- `src/app/admin/roles/[roleSlug]/edit/page.tsx`
- `src/app/admin/themes/[id]/edit/page.tsx`
- `src/app/admin/users/[id]/edit/page.tsx`
- `src/app/components/ExplorerExperience.tsx`
- `src/app/components/share/FactShareModal.tsx`
- `src/app/discover/page.tsx`
- `src/app/discover/theme/[themeSlug]/layout.tsx`
- `src/app/facts/page.tsx`
- `src/app/mentions-legales/page.tsx`
- `src/app/robots.ts`
- `src/config/app.ts`
- `src/lib/auth.ts`
- `SEO_AUDIT_GRUMM.md`
- `AUDIT_TECHNIQUE_GRUMM.md`
- `src/app/decouvrir/theme/[themeSlug]/layout.tsx`

## Actions restantes globales

1. Tester `/admin` avec trois vrais comptes: anonyme, membre, administrateur.
2. Valider les OpenGraph avec un validateur externe après déploiement.
3. Ajouter les requêtes admin d'agrégation funnel.
4. Aligner l'application iOS sur les nouveaux événements funnel web.
5. Ajouter des tests automatisés de middleware si le projet adopte une suite de tests.
