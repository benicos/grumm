# Progression et grade - Rapport Grumm

Date: 2026-06-05

## Objectif quotidien

Statut: FAIT

Fichier modifie:

- `src/app/discover/FactFeed.tsx`

Resultat:

- Le libelle affiche dans le feed passe de `Progression` a `Objectif quotidien`.
- Aucun calcul n'a ete modifie.
- Aucune donnee sauvegardee n'a ete modifiee.
- La barre, le compteur et les animations existantes restent bases sur `dailyProgress.count`, `currentDailyGoal` et `progress`.

## Grade navbar

Statut: FAIT

Solution retenue:

- Desktop: integration compacte dans le lien profil avec icone de grade, nom utilisateur et nom du grade en petite ligne uppercase.
- Mobile: meme logique dans le drawer, sous le nom du profil.

Justification UX:

- Le grade devient une partie de l'identite du compte, sans ajouter de carte ni d'element permanent massif.
- Le rendu reste discret et compatible avec la navbar actuelle.
- Le nom du grade n'est pas cache dans un tooltip uniquement; il est visible mais secondaire.

Fichiers modifies:

- `src/app/components/Navbar.tsx`
- `src/app/auth/AuthProvider.tsx`

Details techniques:

- `AuthProvider` expose maintenant `completedDailyGoals` et `grades` deja charges pour le profil.
- Les grades par defaut sont utilises en fallback si la table `grades` est vide ou indisponible.

## Feedback apres lecture

Statut: FAIT

Comportement:

- Apres une nouvelle lecture comptabilisee, un feedback discret apparait pres de la barre d'objectif:
  - `+1`
  - `Fait decouvert`
  - compteur `x/y`
- Le feedback n'apparait pas pour un fait deja lu aujourd'hui.
- Il ne bloque pas le swipe.
- Il ne demande aucune action utilisateur.

Duree:

- 1 seconde.

Fichier modifie:

- `src/app/discover/FactFeed.tsx`

Details techniques:

- Le feedback utilise `result.uniqueViewCreated` renvoye par `recordFactView`.
- Un timer dedie est nettoye au demontage du composant.
- `prefers-reduced-motion: reduce` coupe l'animation.

## Animation changement de grade

Statut: FAIT

Description detaillee:

- Le comportement standard `Objectif atteint` reste conserve quand aucun grade n'est debloque.
- Si l'objectif quotidien complete debloque un nouveau grade, l'animation standard est remplacee par une animation specifique:
  - titre `Nouveau grade atteint`;
  - nom du nouveau grade;
  - ancien avatar;
  - nouvel avatar;
  - transition visuelle entre les deux;
  - message indiquant que l'avatar evolue avec le nouveau palier.

Declencheur:

- `recordFactView` renvoie `completedToday = true`.
- Le nombre total d'objectifs completes franchit un seuil de grade entre `previousCompletedGoals` et `result.completedDailyGoals`.
- Le seuil est detecte avec les grades exposes par `AuthProvider`, avec fallback sur les grades par defaut.

Fichiers modifies:

- `src/app/discover/FactFeed.tsx`
- `src/app/auth/AuthProvider.tsx`

Comportement temporel:

- Animation standard objectif: 3,6 secondes.
- Animation grade debloque: 5,2 secondes.

Contraintes respectees:

- Pas de carte du savoir ajoutee dans le feed.
- Pas de barre de progression de grade permanente.
- Pas de nouvelles statistiques visibles.
- Pas de nouvel ecran.
- Le feed reste centre sur `1 ecran = 1 fait`.

## Verifications

Responsive:

- La navbar garde une largeur limitee en desktop (`max-w-[230px]`) et tronque les textes longs.
- Le drawer mobile affiche le grade sous le nom sans ajouter de bloc massif.
- L'animation grade utilise une largeur maximale responsive `min(390px, calc(100vw - 40px))`.

Build:

- `npm run lint`: OK.
- `npm run build`: OK, 56 pages generees.

TypeScript:

- Les nouvelles donnees de profil sont typees via `GradeDefinition`.
- L'etat d'animation grade utilise un type dedie `GradeUnlockState`.

## Fichiers modifies

- `PROGRESSION_GRADE_REPORT.md`
- `src/app/auth/AuthProvider.tsx`
- `src/app/components/Navbar.tsx`
- `src/app/discover/FactFeed.tsx`
