# PROFILE_GRADE_STREAK_REPORT

## Fichiers modifiés

- `src/app/profile/page.tsx`
- `src/lib/profile.ts`

## Corrections appliquées

### Hiérarchie pseudo / grade

- Le pseudo est redevenu l'information principale dans l'en-tête du profil.
- Le grade est conservé comme élément secondaire, sous forme de badge cliquable plus discret.
- Les textes `Niveau X` et `X objectifs avant ...` ont été retirés du premier encart.

### Progression de grade

- La barre de progression du grade a été déplacée dans l'encart de grade.
- Le premier encart reste centré sur l'avatar, le pseudo, l'email et le grade discret.
- Le libellé `Prochain déblocage` a été remplacé par `Prochain grade`.

### Série quotidienne

- L'affichage de la série quotidienne a été réintroduit dans un bloc dédié.
- Les pastilles hebdomadaires `L M M J V S D` ont été réintroduites.
- Les états affichés sont :
  - objectif atteint ;
  - jour en cours ;
  - jour passé manqué ;
  - jour futur ou non encore atteint.

## Comportement avant / après

Avant :

- Le grade dominait visuellement le pseudo.
- La progression de grade était dans le premier encart.
- Le premier encart affichait des informations de niveau et d'objectifs qui surchargeaient l'identité utilisateur.
- Une journée en cours non terminée pouvait faire apparaître la série comme perdue.

Après :

- Le pseudo est l'élément principal du header.
- Le grade enrichit le profil sans remplacer l'identité utilisateur.
- La progression est rattachée au bloc `Prochain grade`.
- La série quotidienne reste stable pendant la journée en cours.

## Traitement du jour en cours

Le calcul de série dans `src/lib/profile.ts` démarre maintenant :

- à aujourd'hui si l'objectif d'aujourd'hui est déjà complété ;
- à hier si l'objectif d'aujourd'hui n'est pas encore complété.

Ainsi, si l'utilisateur avait une série de 5 jours hier et que l'objectif du jour est encore en cours, la série reste affichée à 5 jours. Elle n'est pas remise à 0 avant qu'un jour complet précédent soit réellement manqué.

Preuve technique exécutée :

```txt
{"scenario":"today incomplete, previous 5 days completed","streak":5}
```

## Vérifications responsive

- Le header conserve une structure `flex-col` sur mobile et `lg:flex-row` sur grand écran.
- Le bloc de série utilise une grille 7 colonnes pour garder les pastilles alignées sur mobile et desktop.
- Les textes longs du header restent tronqués proprement via `truncate` et `min-w-0`.

## Résultat de `npm run lint`

```txt
OK
```

## Résultat de `npm run build`

```txt
OK
```
