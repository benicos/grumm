# Rapport hero /aujourdhui

## Différences détectées

- `/theme` et `/quiz` utilisent le composant partagé `PageHero`, avec un hero centré, une largeur limitée, un surtitre compact, un titre en gradient premium et un sous-titre court.
- `/aujourdhui` utilisait un hero manuel, aligné à gauche, avec un titre beaucoup plus grand (`clamp(3rem, 7vw, 5.8rem)`) et une largeur de page différente (`1180px` au lieu de `1120px`).
- Le sous-titre de `/aujourdhui` était plus grand et plus dense que ceux de `/theme` et `/quiz`.
- L'espacement vertical de `/aujourdhui` différait aussi : `pt-16 pb-24` contre une structure plus homogène en `py-12` sur les pages de la même famille.
- Le CTA de `/aujourdhui` était inclus dans le bloc hero, alors que les autres pages placent leurs actions principales après le hero partagé.

## Solution retenue

- Remplacer le hero manuel de `/aujourdhui` par le composant `PageHero`.
- Conserver la personnalité éditoriale de la page avec :
  - l'eyebrow dynamique de date (`todayLabel`) ;
  - le titre `Aujourd'hui dans la culture.` ;
  - une description spécifique aux événements, anniversaires et dates culturelles.
- Conserver le CTA `Découvrir le flux`, mais le sortir du hero et le centrer juste en dessous pour garder la même hiérarchie que `/theme` et `/quiz`.
- Harmoniser la largeur et les espacements du conteneur principal avec la famille exploration/apprentissage.

## Composants mutualisés

- `src/app/components/PageHero.tsx`
- `src/app/components/HeroBackground.tsx`
- `src/app/components/Navbar.tsx`

## Fichiers modifiés

- `src/app/aujourdhui/page.tsx`

## Description du rendu final

Le hero de `/aujourdhui` est désormais centré, compact et cohérent avec `/theme` et `/quiz`. Il conserve le fond sombre premium, le titre en gradient sobre, le surtitre discret et le sous-titre calibré. La page garde son identité éditoriale grâce à la date affichée en surtitre et à un texte orienté événements culturels. Le bouton `Découvrir le flux` reste disponible, mais ne casse plus la structure du hero.

