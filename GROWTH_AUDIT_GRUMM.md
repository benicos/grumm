# Growth Audit Grumm

Date: 2026-06-05  
Portee: funnels analytics admin, audit gamification, audit Lighthouse local desktop, corrections rapides non destructives.

## Resume executif

Grumm dispose maintenant d'une base analytics exploitable pour piloter la croissance: les evenements funnel existent et le dashboard admin affiche les conversions, abandons et evolutions temporelles des quatre parcours prioritaires.

Les principaux leviers de croissance et retention sont:

1. Rendre la progression quotidienne plus centrale dans le feed, pas seulement dans le profil.
2. Donner plus de feedback au moment ou un utilisateur gagne un grade ou fait evoluer son avatar.
3. Transformer le quiz en rendez-vous recurrent avec recompense visible.
4. Mettre la carte du savoir plus tot dans le parcours, car elle personnalise fortement l'experience mais reste surtout visible dans le profil.
5. Reduire le JavaScript inutilise et optimiser les avatars, car Lighthouse signale du JS non utilise et les fichiers avatar depassent environ 2 MB chacun.

Preuves techniques:

- Dashboard funnels ajoute dans `/admin` via `getAdminAnalyticsData()`.
- Lighthouse desktop local execute sur `/`, `/decouvrir`, `/theme`, `/quiz`, `/fait/la-premiere-guerre-mondiale-a-commence-en-1914`.
- `npm run lint`: OK apres implementation funnels.
- Lighthouse a genere des JSON dans `.lighthouse/*.json`.

Limites:

- Les scores Lighthouse sont mesures en local, pas sur production reelle.
- Le test `/fait/[slug]` utilise un slug issu du seed local. Si la base Supabase locale/prod ne contient pas ce fait, le score SEO peut refleter une page fallback plutot qu'une vraie page de fait.
- Les conclusions gamification s'appuient sur code, interface et logique produit; elles ne remplacent pas une analyse comportementale live post-deploiement.

## Funnels

### Statut global

FAIT pour l'affichage admin des funnels.  
PARTIEL pour l'analyse metier definitive, car elle dependra des volumes reels apres collecte.

| Funnel | Statut | Observations |
| --- | --- | --- |
| Principal | FAIT | Affiche Homepage -> Discover -> Premier fait lu -> Premier like -> Premier save -> Inscription, avec utilisateurs uniques, conversion, abandon et evolution temporelle. |
| Quiz | FAIT | Affiche Quiz ouvert -> Quiz demarre -> Question repondue -> Quiz termine, avec completion et abandon. |
| Retention | FAIT | Affiche Inscription -> Retour J1 -> Retour J7 -> Retour J30. Le calcul repose sur les evenements ajoutes recemment. |
| Gamification | FAIT | Affiche Profil ouvert -> Avatar consulte -> Objectif valide -> Grade gagne -> Retour lendemain. |

### Implementation admin

Fichiers modifies:

- `src/lib/admin.ts`
- `src/app/admin/page.tsx`

Resultat:

- `AdminAnalyticsData` contient maintenant `funnels.main`, `funnels.quiz`, `funnels.retention`, `funnels.gamification`.
- Chaque funnel calcule:
  - utilisateurs uniques par etape;
  - taux de conversion vs etape precedente;
  - taux d'abandon vs etape precedente;
  - taux de completion global;
  - taux d'abandon global;
  - serie temporelle quotidienne de conversion finale vs periode precedente.
- Le dashboard conserve le style TailAdmin.
- Les admins restent exclus des analytics via la logique existante `AnalyticsProvider` + filtrage admin dans `getAdminAnalyticsData()`.

### Lecture produit attendue

Le funnel principal identifiera le point de friction le plus critique:

- Si `homepage_view -> discover_opened` chute: probleme de proposition de valeur ou CTA.
- Si `discover_opened -> first_fact_read` chute: le feed ne donne pas assez vite un fait engageant.
- Si `first_fact_read -> first_like/save` chute: manque de raisons d'interagir ou UI trop discrete.
- Si `first_save/like -> signup_completed` chute: l'inscription n'est pas assez justifiee au bon moment.

Le funnel quiz mesurera si le quiz est un vrai usage ou seulement une curiosite.

Le funnel retention ne deviendra vraiment utile qu'apres plusieurs semaines de donnees.

Le funnel gamification montrera si les mecaniques de progression sont vues et comprises, pas seulement existantes.

## Gamification

### Grades

Points forts:

- Le systeme existe cote donnees et cote UI.
- Les grades ont des noms thematiques: Curieux, Explorateur, Collectionneur, Erudit, Chroniqueur, Conservateur, Archiviste, Gardien du savoir, Sage de Grumm, Memoire vivante.
- Les seuils progressifs sont clairs dans `src/lib/badges.ts`: 0, 25, 75, 150, 300, 500, 750, 1000, 1500, 2500 objectifs quotidiens.
- Le profil affiche une progression vers le prochain grade et une modal de details.

Points faibles:

- Les premiers paliers peuvent etre trop espacés pour un nouvel utilisateur. 25 objectifs quotidiens avant le deuxieme grade signifie potentiellement plusieurs semaines avant une recompense forte.
- Le gain de grade n'a pas encore une celebration produit tres visible hors profil.
- Les grades dependent d'objectifs quotidiens completes, pas directement de moments d'apprentissage memorables.

Recommandations:

- Ajouter des micro-paliers intermediaires entre 0 et 25 objectifs, par exemple "3 jours", "7 jours", "14 jours".
- Afficher un feedback immediat dans le feed quand un grade est proche.
- Ajouter une notification visuelle forte mais sobre lors d'un `grade_up`.

Potentiel retention:

- Tres fort potentiel si le feedback devient visible au moment de l'usage.
- Potentiel moyen dans l'etat actuel, car la progression existe mais reste concentree dans le profil.

### Avatar

Points forts:

- L'avatar evolue selon le rang via `/public/avatar/avatar_rank_X.png`.
- Le profil explique que l'avatar evoluera avec le grade.
- L'avatar est visuellement fort et associe a l'identite utilisateur.
- Nouvel evenement `avatar_viewed` disponible pour mesurer sa visibilite.

Points faibles:

- Frequence d'evolution probablement trop faible si elle suit les seuils longs des grades.
- La valeur percue depend de la clarte du changement visuel entre avatars.
- Les fichiers avatars sont lourds:
  - `avatar.png`: environ 2.1 MB
  - `avatar_rank_1.png`: environ 2.1 MB
  - `avatar_rank_6.png`: environ 2.4 MB

Recommandations:

- Optimiser les avatars en WebP/AVIF ou PNG compresse.
- Ajouter une preview "prochain avatar" dans la modal de progression.
- Ajouter une animation discrete quand l'avatar evolue.

Potentiel retention:

- Tres fort potentiel. Un avatar evolutif est une recompense identitaire simple a comprendre.

### Objectifs quotidiens

Points forts:

- L'objectif quotidien est visible dans le profil avec barre de progression.
- Le feed suit `daily_goal_completed`.
- La semaine L M M J V S D est presente dans le profil.
- Les streaks existent via `currentStreakDays`.

Points faibles:

- La recompense de validation reste principalement informative.
- L'objectif quotidien devrait etre visible plus tot dans le feed, car c'est la ou l'action se produit.
- Le lien entre objectif valide, grade et avatar n'est pas encore assez dramatise au moment exact de completion.

Recommandations:

- Afficher une mini progression persistante dans `/decouvrir`.
- Montrer "plus que X faits" apres chaque lecture tant que l'objectif n'est pas atteint.
- Lors de l'objectif valide, afficher explicitement l'impact sur le grade/avatar.

Potentiel retention:

- Tres fort potentiel. C'est le meilleur levier de retour quotidien si le feedback est renforce.

### Quiz

Points forts:

- Deux entrees existent: quiz general et defi memoire.
- Le defi memoire est personnalise a partir des faits lus.
- Animations positives/negatives et confettis existent.
- Les evenements `quiz_started`, `quiz_question_answered`, `quiz_completed` permettent maintenant de mesurer l'abandon.

Points faibles:

- La recompense du quiz reste surtout cognitive; il manque un benefice visible sur le profil ou les grades.
- Le quiz n'est pas encore presente comme un rendez-vous recurrent.
- Le lien entre quiz et carte du savoir pourrait etre plus explicite.

Recommandations:

- Ajouter un score hebdomadaire ou badge "memoire de la semaine".
- Faire contribuer le quiz a une progression specifique, separee du simple objectif de lecture.
- Afficher "Revoir tes erreurs" comme levier de retour personnalise.

Potentiel retention:

- Fort potentiel pour les utilisateurs engages.
- Potentiel moyen pour les nouveaux utilisateurs si la recompense reste abstraite.

### Carte du savoir

Points forts:

- Elle personnalise l'identite culturelle de l'utilisateur.
- Elle utilise les themes les plus consultes.
- Elle peut donner un sentiment de progression et de territoire personnel.

Points faibles:

- Elle est surtout visible dans le profil, donc probablement peu consultee par les utilisateurs qui restent dans le feed.
- Sa valeur produit doit etre comprise rapidement: "voici ce que tu deviens en lisant".
- Elle n'a pas encore de CTA evident: continuer un theme, combler un manque, reviser un sujet.

Recommandations:

- Ajouter une version mini dans le feed ou apres X faits lus.
- Rendre chaque noeud actionnable: ouvrir le theme, lancer un quiz du theme, sauvegarder une piste.
- Ajouter un etat "progression culturelle" plus explicite.

Potentiel retention:

- Tres fort potentiel si elle devient actionnable.
- Potentiel moyen dans l'etat actuel, car elle est surtout contemplative.

### Analyse globale

Top 5 des fonctionnalites a plus fort potentiel retention:

1. Objectif quotidien: tres fort potentiel, effort moyen.
2. Avatar evolutif: tres fort potentiel, effort moyen.
3. Carte du savoir actionnable: tres fort potentiel, effort eleve.
4. Defi memoire personnalise: fort potentiel, effort moyen.
5. Grades avec micro-paliers: fort potentiel, effort faible a moyen.

Classement:

- Tres fort potentiel: objectifs quotidiens, avatar evolutif, carte du savoir actionnable.
- Potentiel moyen: quiz general, grades actuels, streak.
- Faible impact seul: affichage passif du grade sans feedback, statistiques brutes sans recompense.

## Lighthouse

Conditions:

- Build Next local.
- `next start` local.
- Lighthouse 13.3.0 via `npx lighthouse`.
- Preset desktop.
- Categories: performance, accessibility, best-practices, SEO.

| Page | Performance | Accessibilite | SEO | Best Practices | LCP | CLS | TBT | TTFB |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `/` | 99 | 100 | 100 | 96 | 1.0 s | 0 | 0 ms | 110 ms |
| `/decouvrir` | 94 | 100 | 100 | 96 | 1.7 s | 0 | 0 ms | 0 ms |
| `/theme` | 98 | 100 | 100 | 96 | 1.0 s | 0 | 0 ms | 0 ms |
| `/quiz` | 99 | 100 | 100 | 96 | 0.9 s | 0 | 0 ms | 10 ms |
| `/fait/la-premiere-guerre-mondiale-a-commence-en-1914` | 93 | 100 | 91 | 96 | 1.7 s | 0 | 0 ms | 120 ms |

Constats performance:

- Les scores sont bons en local desktop.
- LCP reste correct partout; les pages les plus lourdes sont `/decouvrir` et `/fait/[slug]` avec 1.7 s.
- Lighthouse signale du JavaScript inutilise:
  - environ 456 KiB sur home/decouvrir/theme;
  - environ 821 KiB sur `/quiz`;
  - environ 638 KiB sur `/fait/[slug]`.
- Les avatars publics depassent 2 MB chacun, ce qui peut impacter les pages profil et les assets caches.

Constats accessibilite:

- Lighthouse desktop donne 100 sur les pages mesurees.
- Cela ne remplace pas un audit clavier complet, surtout pour feed, quiz et interactions swipe.

Constats SEO:

- Les pages publiques principales sont a 100.
- La page `/fait/[slug]` est a 91 avec alerte `meta-description`. Limite importante: ce test local peut refleter une page fallback si la fact n'est pas resolue depuis Supabase.

Constats best practices:

- Score stable a 96.
- Lighthouse signale une erreur console 404 sur toutes les pages mesurees. L'URL n'est pas exposee dans le JSON extrait; probablement un asset implicite type favicon ou ressource manquante.
- Source maps first-party manquantes pour certains bundles.

## Corrections rapides appliquees

### Dashboard funnels admin

Statut: FAIT.

Fichiers:

- `src/lib/admin.ts`
- `src/app/admin/page.tsx`

Resultat:

- Les funnels sont visibles dans l'administration.
- Aucune refonte lourde.
- Style TailAdmin conserve.
- Calculs bases sur les evenements existants et ajoutes.

### Autres corrections rapides

Statut: PARTIEL.

Je n'ai pas recompresse les avatars ou modifie des assets binaires dans cette passe, car cela necessite une validation visuelle. Je les classe cependant comme amelioration prioritaire.

## Top 10 ameliorations recommandees

### Impact eleve / effort faible

1. Afficher "plus que X faits pour ton objectif" directement dans le feed.
2. Ajouter un etat "proche du prochain grade" dans le feed apres une lecture.
3. Ajouter dans l'admin un tableau de conversion funnel par jour avec tri sur les plus fortes chutes.
4. Corriger l'asset 404 signale par Lighthouse, probablement favicon/ressource manquante.
5. Ajouter un evenement `signup_started` pour mesurer l'abandon avant creation de compte.

### Impact eleve / effort moyen

6. Compresser les avatars en WebP/AVIF et garder les PNG seulement si necessaire.
7. Ajouter une celebration de grade gagne avec preview du nouvel avatar.
8. Rendre le quiz hebdomadaire avec score sauvegarde et recompense visible.
9. Ajouter une mini carte du savoir dans le feed apres plusieurs faits lus.

### Impact eleve / effort eleve

10. Transformer la carte du savoir en systeme actionnable: noeuds cliquables, recommandations de themes, quiz par theme, progression par territoire culturel.

## Fichiers modifies

Fichiers modifies par cette mission:

- `GROWTH_AUDIT_GRUMM.md`
- `src/lib/admin.ts`
- `src/app/admin/page.tsx`

Fichiers deja modifies avant cette mission et encore presents dans le worktree:

- `ADMIN_OG_FUNNELS_REPORT.md`
- `AUDIT_TECHNIQUE_GRUMM.md`
- `SEO_AUDIT_GRUMM.md`
- `README.md`
- `apps/ios/README.md`
- `apps/ios/src/components/FactShareStory.tsx`
- `apps/ios/src/config/app.ts`
- `middleware.ts`
- `next.config.ts`
- `src/app/admin/facts/[id]/edit/page.tsx`
- `src/app/admin/grades/[id]/edit/page.tsx`
- `src/app/admin/quizzes/[id]/edit/page.tsx`
- `src/app/admin/roles/[roleSlug]/edit/page.tsx`
- `src/app/admin/themes/[id]/edit/page.tsx`
- `src/app/admin/users/[id]/edit/page.tsx`
- `src/app/aujourdhui/opengraph-image.tsx`
- `src/app/aujourdhui/page.tsx`
- `src/app/auth/AuthProvider.tsx`
- `src/app/components/AnalyticsProvider.tsx`
- `src/app/components/ExplorerExperience.tsx`
- `src/app/components/share/FactShareModal.tsx`
- `src/app/contact/opengraph-image.tsx`
- `src/app/contact/page.tsx`
- `src/app/decouvrir/opengraph-image.tsx`
- `src/app/decouvrir/page.tsx`
- `src/app/decouvrir/theme/[themeSlug]/layout.tsx`
- `src/app/discover/FactFeed.tsx`
- `src/app/discover/page.tsx`
- `src/app/discover/theme/[themeSlug]/layout.tsx`
- `src/app/fact/[factSlug]/page.tsx`
- `src/app/facts/page.tsx`
- `src/app/mentions-legales/page.tsx`
- `src/app/opengraph-image.tsx`
- `src/app/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/quiz/general/QuizExperience.tsx`
- `src/app/quiz/general/opengraph-image.tsx`
- `src/app/quiz/general/page.tsx`
- `src/app/quiz/memoire/MemoryChallengePage.tsx`
- `src/app/quiz/opengraph-image.tsx`
- `src/app/quiz/page.tsx`
- `src/app/robots.ts`
- `src/app/theme/opengraph-image.tsx`
- `src/app/theme/page.tsx`
- `src/config/app.ts`
- `src/lib/analytics/web.ts`
- `src/lib/auth.ts`
- `src/lib/ogImage.tsx`
- `src/lib/serverMetadata.ts`
- `src/lib/supabase/adminAuthCookie.ts`

Artefacts d'audit generes:

- `.lighthouse/home.json`
- `.lighthouse/decouvrir.json`
- `.lighthouse/theme.json`
- `.lighthouse/quiz.json`
- `.lighthouse/fait.json`

## Verification finale a executer

- `npm run lint`
- `npm run build`

Statut au moment de redaction:

- `npm run lint`: OK apres ajout des funnels admin et creation du rapport.
- `npm run build`: OK apres ajout des funnels admin et creation du rapport; 56 pages generees.
