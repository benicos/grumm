# Audit technique Grumm

Date: 2026-06-05  
Domaine officiel attendu: `https://grumm.fr`  
Portee: site public, SEO, sitemap, analytics, accessibilite, securite, performance, contenu. Les pages individuelles de faits ne sont pas detaillees page par page, mais leur mecanisme SEO a ete verifie dans le code.

## Resume executif

### Critique

- Domaine public: corrige et centralise. `SITE_URL` vaut maintenant `https://grumm.fr` dans `src/config/app.ts`; les helpers SEO, sitemap, robots, liens de partage web et configuration iOS s'appuient sur cette valeur.
- Ancien domaine de preview: aucune URL publique de preview detectee dans le code source applicatif apres correction. Une redirection middleware force les hotes de preview vers `https://grumm.fr`.
- Pages privees: `/admin`, `/login`, `/register`, `/profile`, `/profil`, `/saved`, `/reset-password`, `/forgot-password` et `/quiz/memoire` sont exclues via `robots.ts` ou metadata `noindex`. Le sitemap n'inclut pas ces routes.

### Important

- SEO public: base saine, mais partielle. Les canonical et Open Graph URLs utilisent `https://grumm.fr`; les pages de faits ont une image OG dynamique. Les pages publiques generiques n'ont pas encore d'image OG dediee.
- Sitemap: propre pour les URLs et exclusions, mais aucune priorite n'est emise. C'est acceptable pour Google, mais la demande de coherence des priorites reste donc partielle.
- Securite admin: les politiques RLS et permissions admin existent, mais l'interface `/admin` repose encore sur un guard client dans `AdminShell`. Les donnees sensibles restent protegees par Supabase/RLS, mais un guard serveur/middleware renforcerait l'UX et la surface d'exposition.
- Analytics: les evenements produit sont batchs, exclus de `/admin`, et les admins sont filtres cote dashboard. Il manque encore une formalisation complete des funnels acquisition/activation/retention.

### Mineur

- Accessibilite: ajout d'un label invisible sur la recherche Explorer et d'un alt descriptif sur l'avatar du profil. Un audit clavier/contraste avec outil dedie reste a faire.
- Performance: `html-to-image` est charge dynamiquement uniquement quand l'utilisateur genere une image de partage. Un bundle analyzer reste necessaire pour mesurer le gain exact.
- Contenu: les champs SEO existent pour les faits et themes, mais la qualite des titres/descriptions doit etre verifiee sur les donnees de production.

## Checklist technique

| Domaine | Statut | Preuves | Reste a faire |
| --- | --- | --- | --- |
| Domaine officiel | FAIT | `SITE_URL = "https://grumm.fr"` dans `src/config/app.ts`; `middleware.ts` redirige les hotes de preview vers `https://grumm.fr`; recherches des anciens domaines sans resultat applicatif. | Verifier aussi la configuration de domaine dans Vercel et Supabase Auth dashboard. |
| SEO | PARTIEL | `metadataBase` utilise `getSiteUrl()`; `buildDefaultMetadata` genere canonical + OG URL; pages facts et themes ont metadata dynamiques. | Ajouter une image OG globale pour les pages non-faits; crawler les pages de prod. |
| Sitemap | PARTIEL | `src/app/sitemap.ts` utilise `buildCanonicalUrl`; routes privees absentes; facts publies et themes publics inclus. | Ajouter `priority`/`changeFrequency` si l'on veut controler explicitement la coherence. |
| Pages de faits | PARTIEL | `/fact/[slug]` redirige vers `/fait/[slug]`; `/fait/[slug]/layout.tsx` exporte metadata dynamiques; JSON-LD Article present. | Verifier unicite SEO sur toutes les donnees publiees de production. |
| Maillage interne | PARTIEL | Home lie vers Decouvrir, Explorer/themes et Quiz; redirects historiques en place. | Ajouter des liens contextuels entre themes, faits lies et pages editoriales selon les donnees. |
| Performance | PARTIEL | `html-to-image` passe en import dynamique; Next build verifie. | Lancer bundle analyzer, verifier LCP/images et profiler les feeds. |
| Analytics | PARTIEL | Evenements: `app_opened`, `page_viewed`, `explorer_search`, `fact_view`, `fact_swipe`, `fact_read_completed`, `fact_like`, `fact_save`, `daily_goal_completed`, `signup_completed`, `login_completed`, etc. Exclusion `/admin` dans `canTrackProductAnalytics`. | Formaliser funnels acquisition/activation/retention et dashboards dedies. |
| Accessibilite | PARTIEL | Label `sr-only` ajoute a la recherche Explorer; alt avatar ajoute; plusieurs `aria-label` presents sur modales/nav. | Audit clavier complet, axe, contraste exact sur themes gradients. |
| Securite | PARTIEL | RLS active sur tables principales; policies admin/utilisateur presentes; pas de service key client detectee; `sb_secret_` refuse en client metadata. | Ajouter un guard serveur pour `/admin`; verifier Supabase dashboard et policies live. |
| Contenu | PARTIEL | Champs `seo_title`, `seo_description`, `hook`, `content`, `long_content` utilises en fallback. | Audit editorial complet sur la base de production; renforcer titres uniques et descriptions. |

## Corrections appliquees pendant cette passe

- Centralisation stricte du domaine public via `SITE_URL = "https://grumm.fr"`.
- Suppression des dependances aux URLs Vercel dans les metadata, sitemap, robots, partages web et configuration iOS.
- Ajout d'un middleware de redirection d'hote vers `https://grumm.fr`.
- Passage du redirect password reset Supabase sur `https://grumm.fr/reset-password` au lieu de `window.location.origin`.
- Exclusion explicite de `/saved` dans `robots.ts`.
- Ajout de routes canonical/noindex pour les aliases `/discover`, `/facts`, `/discover/theme/[slug]`, `/decouvrir/theme/[slug]`.
- Ajout de redirects SEO pour `/explore -> /theme` et `/today -> /aujourdhui`.
- Import dynamique de `html-to-image` dans la modale de partage.
- Ajout d'un label accessible sur la recherche Explorer.
- Ajout d'un alt descriptif sur l'avatar du profil.

## Audit SEO page par page

| Route | Indexation | Title actuel | Description actuelle | Canonical | OG title/description | Image OG | JSON-LD | Sitemap | Probleme | Recommandation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | indexable | `Grumm.` | Description globale `siteConfig.description` | `https://grumm.fr/` | Oui via `buildDefaultMetadata` | Non globale | Non detecte | Oui | Pas d'image OG dediee. | Ajouter `app/opengraph-image.tsx`; title propose: `Grumm. - La culture qui se scrolle`; description proposee: `Decouvre chaque jour des faits courts, memorables et relies pour nourrir ta culture sans perdre le fil.` |
| `/a-propos` | indexable | `À propos` | Presentation de Grumm | `https://grumm.fr/a-propos` | Oui | Non globale | Non | Oui | Title trop court. | Title propose: `À propos de Grumm. - Une nouvelle maniere d'apprendre`; description proposee: `Pourquoi Grumm transforme les faits culturels en une experience courte, fluide et memorable.` |
| `/decouvrir` | indexable | `Découvrir` | Flux de faits courts | `https://grumm.fr/decouvrir` | Oui | Non globale | Non | Oui | Title generique. | Title propose: `Découvrir - Le flux culturel Grumm`; description proposee: `Fais defiler des faits courts et surprenants, enregistres tes favoris et explore la culture par curiosite.` |
| `/discover` | noindex/redirect | `Découvrir` si rendu | Flux Grumm | canonical `/decouvrir` | Oui | Non | Non | Non | Alias historique; redirect permanent dans `next.config.ts`. | Conserver redirect; ne pas inclure au sitemap. |
| `/explore` | redirect | N/A | N/A | `/theme` apres redirect | N/A | N/A | N/A | Non | Ancien alias. | Conserver redirect vers `/theme`. |
| `/theme` | indexable | `Explorer` | Themes culturels | `https://grumm.fr/theme` | Oui | Non globale | Non | Oui | Title peut etre plus descriptif. | Title propose: `Explorer les themes - Grumm`; description proposee: `Parcours les grands themes de Grumm, de l'histoire aux sciences, et lance un flux dedie a tes sujets preferes.` |
| `/theme/[slug]` | indexable | Dynamique via theme | Dynamique via theme | `https://grumm.fr/theme/[slug]` | Oui | Non globale | `CollectionPage` | Oui si theme public | Depend de la qualite des champs theme. | Exiger `seo_title` et `seo_description` editorialises pour chaque theme important. |
| `/decouvrir/theme/[slug]` | noindex | Layout noindex | Flux filtre | Alias flux | Non detaille | Non | Non | Non | Page fonctionnelle mais non indexable pour eviter doublon avec `/theme/[slug]`. | Conserver noindex et lien utilisateur. |
| `/quiz` | indexable | `Grumm Quiz` | Memorisation et quiz | `https://grumm.fr/quiz` | Oui | Non globale | Non | Oui | Pas d'OG image. | Title propose: `Quiz Grumm - Memorise ce que tu decouvres`; description proposee: `Teste ta memoire, revise tes faits lus et transforme tes decouvertes en connaissances durables.` |
| `/quiz/general` | indexable | `Grumm Quiz général` | Quiz general | `https://grumm.fr/quiz/general` | Oui | Non globale | Non | Oui | Page indexable, mais pas de schema `Quiz`/`LearningResource`. | Ajouter JSON-LD adapte si le contenu devient stable. |
| `/quiz/memoire` | noindex | `Défi mémoire` | Reserve aux comptes | `https://grumm.fr/quiz/memoire` | Oui | Non | Non | Non | Page personnelle, correctement noindex. | Conserver hors sitemap. |
| `/aujourdhui` | indexable | `Aujourd’hui` | Dates editoriales | `https://grumm.fr/aujourdhui` | Oui | Non globale | `CollectionPage` | Oui | Title court. | Title propose: `Aujourd'hui dans l'Histoire - Grumm`; description proposee: `Retrouve les faits culturels lies a la date du jour et comprends ce qui s'est joue aujourd'hui dans l'histoire.` |
| `/today` | redirect | N/A | N/A | `/aujourdhui` apres redirect | N/A | N/A | N/A | Non | Alias anglophone. | Conserver redirect permanent. |
| `/contact` | indexable | `Contact` | Contact editorial | `https://grumm.fr/contact` | Oui | Non globale | Non | Oui | Title court. | Title propose: `Contact - Grumm`; description proposee: `Contacter l'equipe Grumm pour signaler une erreur, proposer un sujet ou echanger autour du projet.` |
| `/politique-confidentialite` | indexable | `Politique de confidentialité` | Politique Grumm | `https://grumm.fr/politique-confidentialite` | Oui | Non | Non | Oui | Correct pour page legale. | Conserver. |
| `/mentions-legales` | indexable | `Mentions légales` | Mentions Grumm | `https://grumm.fr/mentions-legales` | Oui | Non | Non | Oui | Corrige pour mentionner le domaine officiel. | Conserver. |
| `/login` | noindex | `Connexion` | Non renseignee | Pas de canonical explicite | Non | Non | Non | Non | Auth privee, noindex correct. | Ajouter description courte noindex si besoin UX partage interne. |
| `/register` | noindex | `Inscription` | Non renseignee | Pas de canonical explicite | Non | Non | Non | Non | Auth privee, noindex correct. | Conserver hors sitemap. |
| `/forgot-password` | noindex | `Mot de passe oublié` | Non renseignee | Pas de canonical explicite | Non | Non | Non | Non | Auth privee, noindex correct. | Conserver hors sitemap. |
| `/reset-password` | noindex | `Nouveau mot de passe` | Non renseignee | Pas de canonical explicite | Non | Non | Non | Non | Auth privee, noindex correct. | Conserver hors sitemap. |
| `/profile` et `/profil` | noindex/redirect | `Profil` | Non renseignee | Non indexable | Non | Non | Non | Non | Compte utilisateur, correctement exclu. | Conserver. |
| `/saved` | noindex attendu robots | N/A si route absente ou privee | N/A | N/A | N/A | N/A | N/A | Non | Exclu dans robots. | Verifier si route creee plus tard qu'elle garde noindex. |

## Pages de faits `/fait/[slug]`

Preuves:

- `/fact/:factSlug` redirige de facon permanente vers `/fait/:factSlug`.
- `src/app/fait/[factSlug]/layout.tsx` reutilise `src/app/fact/[factSlug]/layout.tsx`.
- Metadata dynamiques: title, description, canonical, Open Graph article, Twitter large image.
- Canonical construit avec `absoluteUrl(fact.canonicalPath)`, donc `https://grumm.fr/fait/[slug]`.
- Image OG dynamique: `https://grumm.fr/fait/[slug]/opengraph-image`.
- JSON-LD Article present dans `src/app/fact/[factSlug]/page.tsx`.
- H1 unique detecte dans la page de detail.

Anomalies:

- L'unicite effective des titles/descriptions depend des donnees Supabase (`seo_title`, `seo_description`, `hook`, `content`).
- Aucun scan live complet de toutes les facts publiees n'a ete effectue dans cette passe.

Recommandations:

- Ajouter un script d'audit contenu qui signale les `seo_title` vides, doublons, descriptions courtes et facts sans source quand la source est editorialement attendue.
- Conserver `/fait/[slug]` comme route canonique unique.

## Sitemap

Preuves:

- `src/app/sitemap.ts` genere toutes les URLs avec `buildCanonicalUrl`.
- Routes statiques incluses: `/`, `/a-propos`, `/decouvrir`, `/theme`, `/quiz`, `/quiz/general`, `/aujourdhui`, `/contact`, `/politique-confidentialite`, `/mentions-legales`.
- Themes publics inclus via `/theme/[slug]`.
- Facts publiees incluses via `/fait/[slug]`.
- Routes privees et aliases non inclus: `/admin`, `/login`, `/register`, `/profile`, `/profil`, `/saved`, `/discover`, `/explore`, `/fact/[slug]`.

Limite:

- Aucune priorite ni `changeFrequency` n'est emise. Ce n'est pas bloquant, mais la demande "priority coherence" n'est pas totalement couverte.

## Maillage interne

Constats:

- La home met en avant `Découvrir`, `Explorer` et `Quiz`.
- `/theme` devient la page Explorer principale pour les themes.
- Les pages de themes listent des faits et renvoient vers `/fait/[slug]`.
- Le feed `/decouvrir` renvoie vers les themes via `/decouvrir/theme/[slug]` pour l'usage produit, tout en gardant `/theme/[slug]` pour le SEO.
- Les anciennes routes sont redirigees: `/explorer`, `/explore`, `/discover`, `/today`, `/fact/[slug]`, `/quizz`.

Opportunites:

- Ajouter des liens "faits lies" plus visibles dans les pages de faits.
- Relier `/aujourdhui` depuis la home quand une date editoriale existe.
- Ajouter un bloc editorial "themes proches" sur `/theme/[slug]`.

## Performance

Corrections appliquees:

- `html-to-image` n'est plus dans l'import statique de `FactShareModal`; il est charge seulement lors de la generation d'une image de partage.

Risques observes:

- Pas de bundle analyzer configure.
- Plusieurs pages riches sont en composants client: feed, profil, quiz, admin. C'est coherent fonctionnellement, mais a surveiller pour LCP/hydration.
- Les images de themes/facts doivent etre auditees en production pour verifier tailles, formats et `priority`.

Recommandations:

- Ajouter `ANALYZE=true next build` avec bundle analyzer.
- Mesurer LCP sur `/`, `/decouvrir`, `/theme`, `/fait/[slug]`.
- Lazy-load les modules de partage, quiz secondaires et visualisations non visibles au premier viewport.

## Analytics

Evenements detectes:

- Acquisition/navigation: `app_opened`, `page_viewed`, `category_opened`, `search_used`, `explorer_search`, `explorer_search_no_result`.
- Activation: `signup_completed`, `login_completed`, `fact_view`, `fact_viewed`.
- Engagement: `fact_swipe`, `fact_read_completed`, `fact_shared`, `source_clicked`, `fact_like`, `fact_liked`, `fact_save`, `fact_saved`, `daily_goal_completed`, `profile_opened`.
- Admin: `admin_fact_created`, `admin_fact_updated`.

Preuves de sobriete:

- `canTrackProductAnalytics()` exclut `/admin`.
- Les evenements sont batches (`EVENT_BATCH_SIZE = 8`, debounce `3200ms`).
- Les sessions analytics sont stockees avec `anonymous_id` ou `user_id`.
- Le dashboard admin exclut les profils `administrateur` dans plusieurs agregations.

Manques:

- Pas de funnel explicitement nomme pour `first_fact_read`, `first_like`, `first_save`, `first_quiz_completed`.
- Retention D1/D7 calculee cote admin, mais a verifier sur donnees live.
- Pas de tracking source marketing/UTM visible dans cette passe.

## Accessibilite

Corrections appliquees:

- `src/app/components/ExplorerExperience.tsx`: ajout d'un label `sr-only` pour l'input de recherche.
- `src/app/profile/page.tsx`: alt descriptif pour l'avatar de rang.

Preuves positives:

- Plusieurs boutons critiques ont des labels visibles ou `aria-label`.
- Les modales de partage ont des boutons de fermeture libelles.
- La navigation admin a des labels screen-reader pour recherche/menu.

Points a auditer:

- Contraste exact des textes sur gradients de themes.
- Navigation clavier dans les carrousels/feed et cards interactives.
- Focus visible sur les CTA premium du site public.

## Securite

Preuves:

- RLS active sur tables principales: `categories`, `facts`, `profiles`, `likes`, `saves`, `views`, `user_fact_views`, analytics, quiz, roles, grades.
- Policies separent lecture publique des facts publiees, donnees propres utilisateur, et gestion admin.
- Le client Supabase refuse les cles `sb_secret_`.
- Aucune cle service role exposee dans `src` ou `apps/ios`; les occurrences `service_role` sont dans SQL/policies.
- `/admin` est noindex et gere par `AdminShell` avec `canAccessAdmin`.

Limite:

- L'interdiction admin est essentiellement appliquee cote client UI pour le routing. Les donnees restent protegees par RLS, mais un middleware ou guard serveur offrirait une meilleure protection de surface.

Recommandations:

- Ajouter un middleware auth serveur pour `/admin/:path*` si la stack Supabase/Next le permet proprement.
- Verifier les policies live dans Supabase, pas uniquement les fichiers de migrations.
- Garder les pages compte/auth hors index.

## Contenu

Constats:

- Les facts disposent de champs SEO (`seo_title`, `seo_description`) et de fallbacks (`title`, `hook`, `content`, `long_content`).
- Les themes disposent de champs courts/longs, keywords et SEO.
- Les sources sont traitees comme optionnelles dans l'experience produit.

Risques:

- Des descriptions SEO construites depuis le contenu peuvent etre trop courtes ou trop proches entre plusieurs facts.
- Les pages themes dependent fortement de `seo_description` et `description_longue`.
- Impossible de valider la qualite complete sans extraction de la base de production.

Recommandations:

- Script editorial hebdomadaire: doublons de titres, descriptions < 80 caracteres, facts sans `seo_description`, themes sans description longue.
- Regles admin: afficher une alerte non bloquante si `seo_description` est vide sur un fait publie.

## Fichiers modifies

### Modifies dans cette passe d'audit/corrections SEO

- `README.md`
- `apps/ios/README.md`
- `apps/ios/src/components/FactShareStory.tsx`
- `apps/ios/src/config/app.ts`
- `middleware.ts`
- `next.config.ts`
- `src/app/components/ExplorerExperience.tsx`
- `src/app/components/share/FactShareModal.tsx`
- `src/app/decouvrir/theme/[themeSlug]/layout.tsx`
- `src/app/discover/page.tsx`
- `src/app/discover/theme/[themeSlug]/layout.tsx`
- `src/app/facts/page.tsx`
- `src/app/mentions-legales/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/robots.ts`
- `src/config/app.ts`
- `src/lib/auth.ts`
- `src/lib/serverMetadata.ts`
- `AUDIT_TECHNIQUE_GRUMM.md`
- `SEO_AUDIT_GRUMM.md`

### Fichiers deja modifies dans le worktree avant cet audit et encore presents

- `src/app/admin/facts/[id]/edit/page.tsx`
- `src/app/admin/grades/[id]/edit/page.tsx`
- `src/app/admin/quizzes/[id]/edit/page.tsx`
- `src/app/admin/roles/[roleSlug]/edit/page.tsx`
- `src/app/admin/themes/[id]/edit/page.tsx`
- `src/app/admin/users/[id]/edit/page.tsx`

## Actions restantes prioritaires

1. Configurer un guard serveur pour `/admin`.
2. Ajouter une image OG globale pour les pages publiques non-faits.
3. Ajouter un script d'audit SEO contenu connecte a Supabase prod.
4. Ajouter `priority`/`changeFrequency` au sitemap si l'on veut piloter explicitement ces signaux.
5. Lancer un audit Lighthouse/axe sur `/`, `/decouvrir`, `/theme`, `/quiz`, `/fait/[slug]`.
6. Formaliser un dashboard funnel: acquisition, activation, engagement, retention.

## Verification finale executee

- Recherche exacte de l'ancien domaine Grumm de preview: aucun resultat hors artefacts ignores.
- Recherche exacte du domaine generique de preview: aucun resultat hors artefacts ignores.
- Recherche exacte de l'ancienne marque projet: aucun resultat hors artefacts ignores.
- `npm run lint`: OK.
- `npm run build`: OK, TypeScript valide, 49 pages statiques generees.
- Verification runtime `/sitemap.xml`: contient `https://grumm.fr`, ne contient aucune URL de preview.
- Premieres URLs sitemap verifiees: `https://grumm.fr/`, `/a-propos`, `/decouvrir`, `/theme`, `/quiz`, `/quiz/general`, `/aujourdhui`, `/contact`.
- Verification runtime host preview: redirection `308` vers `https://grumm.fr/theme`.
