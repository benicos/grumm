# Audit SEO Grumm

Date : 2026-06-05  
Domaine public officiel : `https://grumm.fr`

## Synthèse

- L'URL canonique centrale est verrouillée sur `https://grumm.fr` via `SITE_URL`.
- `metadataBase`, canonical, Open Graph, Twitter cards, JSON-LD, sitemap et robots utilisent désormais `https://grumm.fr`.
- Les liens de partage web et iOS utilisent `https://grumm.fr`.
- Les routes privées, compte et admin sont noindex ou exclues de `robots.txt`.
- Les pages individuelles de faits `/fait/[slug]` ne sont pas détaillées ci-dessous, mais leur layout génère bien canonical, OG et Twitter avec `https://grumm.fr`.
- Point d'amélioration restant : les pages publiques génériques n'ont pas encore d'image Open Graph par défaut, hors pages de faits qui utilisent une image OG dynamique.

## Routes Publiques Et SEO

| Route | Indexable | Title SEO actuel | Description SEO actuelle | Canonical actuelle | OG title | OG description | Image OG | JSON-LD | Sitemap | Problème détecté | Recommandation | Proposition title | Proposition description |
|---|---:|---|---|---|---|---|---:|---:|---:|---|---|---|---|
| `/` | Oui | `Grumm.` | Description globale Grumm | `https://grumm.fr/` | `Grumm.` | Description globale | Non | Non | Oui | Pas d'image OG par défaut | Ajouter une image OG de marque | `Grumm. - La culture qui se scrolle` | `Découvre chaque jour des faits courts, mémorables et reliés pour nourrir ta culture générale.` |
| `/decouvrir` | Oui | `Découvrir` | Flux de faits courts, culturels et mémorables | `https://grumm.fr/decouvrir` | `Découvrir` | Identique | Non | Non | Oui | Title trop générique | Renforcer l'intention produit | `Découvrir des faits culturels courts` | `Explore un flux vertical de faits culturels courts, surprenants et faciles à retenir sur Grumm.` |
| `/discover` | Non | `Découvrir` | Flux Grumm mémorable | `https://grumm.fr/decouvrir` | `Découvrir` | Identique | Non | Non | Non | Route anglaise héritée | Garder la redirection 301 vers `/decouvrir` | `Découvrir` | `Redirection vers le flux Grumm officiel.` |
| `/facts` | Non | `Faits` | Découvrir les faits Grumm dans le flux principal | `https://grumm.fr/decouvrir` | `Faits` | Identique | Non | Non | Non | Doublon de `/decouvrir` | Conserver noindex ou rediriger vers `/decouvrir` | `Faits Grumm` | `Accède au flux canonique de faits courts sur Grumm.` |
| `/theme` | Oui | `Explorer` | Explore les thèmes, recherches populaires et portes d'entrée culturelles | `https://grumm.fr/theme` | `Explorer` | Identique | Non | Non | Oui | Pas d'image OG | Ajouter OG image générique Explorer | `Explorer les thèmes culturels` | `Cherche un sujet, découvre tous les thèmes Grumm et ouvre un parcours culturel adapté à ta curiosité.` |
| `/theme/[slug]` | Oui | Dynamique par thème | Dynamique par thème | `https://grumm.fr/theme/[slug]` | Dynamique | Dynamique | Non | Oui | Oui | Pas d'image OG de thème | Générer une OG image par thème si possible | `[Thème] : faits et repères essentiels` | `Explore les faits essentiels du thème [Thème] sur Grumm, avec des repères courts et mémorables.` |
| `/decouvrir/theme/[slug]` | Non | Hérite du layout/app | Flux filtré par thème | Aucune canonical dédiée | N/A | N/A | Non | Non | Non | Peut concurrencer `/theme/[slug]` | Noindex ajouté, garder comme expérience produit | `Flux du thème [Thème]` | `Flux filtré non indexable pour explorer un thème dans Découvrir.` |
| `/discover/theme/[slug]` | Non | Hérite du layout/app | Route héritée | Redirigée vers `/decouvrir/theme/[slug]` | N/A | N/A | Non | Non | Non | Route anglaise héritée | Garder redirection/noindex | `Flux du thème [Thème]` | `Route héritée redirigée vers le flux filtré français.` |
| `/quiz` | Oui | `Grumm Quiz` | Choisis ton expérience de quiz Grumm | `https://grumm.fr/quiz` | `Grumm Quiz` | Identique | Non | Non | Oui | Pas d'image OG | Ajouter OG image Quiz | `Quiz culture générale Grumm` | `Teste ce que tu retiens avec des quiz courts et élégants autour des faits découverts sur Grumm.` |
| `/quiz/general` | Oui | `Grumm Quiz général` | Quiz rapide pensé pour apprendre à chaque réponse | `https://grumm.fr/quiz/general` | `Grumm Quiz général` | Identique | Non | Non | Oui | Correct, OG image absente | Ajouter une image OG quiz | `Quiz culture générale rapide` | `Réponds à une série courte de questions et mémorise mieux les faits culturels découverts sur Grumm.` |
| `/quiz/memoire` | Non | `Défi mémoire` | Défi mémoire personnalisé réservé aux comptes Grumm | `https://grumm.fr/quiz/memoire` | `Défi mémoire` | Identique | Non | Non | Non | Page personnalisée | Noindex correct | `Défi mémoire Grumm` | `Connecte-toi pour réviser les faits que tu as déjà lus sur Grumm.` |
| `/quizz` | Non | Redirection | Redirection vers `/quiz` | `https://grumm.fr/quiz` | N/A | N/A | Non | Non | Non | Ancienne route | Redirection 301 conservée | `Quiz Grumm` | `Route héritée redirigée vers le quiz Grumm.` |
| `/aujourdhui` | Oui | `Aujourd'hui` | Faits culturels liés à la date du jour | `https://grumm.fr/aujourdhui` | `Aujourd'hui` | Identique | Non | Oui | Oui | Bon positionnement, image OG absente | Ajouter OG quotidienne | `Aujourd'hui dans l'Histoire et la culture` | `Découvre les faits culturels liés à la date du jour, avec une sélection quotidienne pour nourrir ta curiosité.` |
| `/today` | Non | Redirection | Redirection vers `/aujourdhui` | `https://grumm.fr/aujourdhui` | N/A | N/A | Non | Non | Non | Route anglaise non canonique | Redirection 301 ajoutée | `Aujourd'hui sur Grumm` | `Route héritée redirigée vers la page quotidienne française.` |
| `/a-propos` | Oui | `À propos` | Présentation de Grumm | `https://grumm.fr/a-propos` | `À propos` | Identique | Non | Non | Oui | Title court | Renforcer la proposition éditoriale | `À propos de Grumm` | `Découvre la vision de Grumm : apprendre un fait à la fois, retenir davantage et nourrir sa culture générale.` |
| `/about` | Non | Redirection/export | Redirection vers `/a-propos` | `https://grumm.fr/a-propos` | N/A | N/A | Non | Non | Non | Route anglaise héritée | Redirection 301 conservée | `À propos de Grumm` | `Route héritée redirigée vers la page À propos française.` |
| `/contact` | Oui | `Contact` | Contact Grumm pour question/correction/compte | `https://grumm.fr/contact` | `Contact` | Identique | Non | Non | Oui | Correct | Ajouter Organization JSON-LD plus tard | `Contact Grumm` | `Contacte Grumm pour une question, une correction éditoriale ou une demande liée à ton compte.` |
| `/mentions-legales` | Oui | `Mentions légales` | Mentions légales Grumm | `https://grumm.fr/mentions-legales` | `Mentions légales` | Identique | Non | Non | Oui | Correct | Maintenir les informations éditeur/hébergeur à jour | `Mentions légales Grumm` | `Consulte les informations légales de Grumm : éditeur, contact, hébergement, propriété intellectuelle et responsabilité éditoriale.` |
| `/politique-confidentialite` | Oui | `Politique de confidentialité` | Compte, progression, sauvegardes, analytics limités | `https://grumm.fr/politique-confidentialite` | Identique | Identique | Non | Non | Oui | Correct | Mettre à jour si les outils analytics changent | `Politique de confidentialité Grumm` | `Comprends quelles données Grumm collecte pour le compte, la progression, les sauvegardes, la personnalisation et les analytics limités.` |
| `/privacy-policy` | Non | Redirection/export | Redirection vers `/politique-confidentialite` | `https://grumm.fr/politique-confidentialite` | N/A | N/A | Non | Non | Non | Route anglaise héritée | Redirection 301 conservée | `Politique de confidentialité Grumm` | `Route héritée redirigée vers la politique de confidentialité française.` |
| `/login` | Non | `Connexion` | Non renseignée spécifiquement | Aucune canonical dédiée | N/A | N/A | Non | Non | Non | Noindex correct | Ajouter une description noindex propre si besoin | `Connexion Grumm` | `Connecte-toi à ton compte Grumm pour retrouver ta progression et tes faits enregistrés.` |
| `/register` | Non | `Inscription` | Non renseignée spécifiquement | Aucune canonical dédiée | N/A | N/A | Non | Non | Non | Noindex correct | Ajouter une description noindex propre si besoin | `Créer un compte Grumm` | `Crée ton compte Grumm pour sauvegarder ta progression, personnaliser ton feed et réviser tes faits.` |
| `/forgot-password` | Non | `Mot de passe oublié` | Non renseignée spécifiquement | Aucune canonical dédiée | N/A | N/A | Non | Non | Non | Noindex correct | Aucun changement nécessaire | `Mot de passe oublié` | `Demande un lien de réinitialisation pour ton compte Grumm.` |
| `/reset-password` | Non | `Nouveau mot de passe` | Non renseignée spécifiquement | Aucune canonical dédiée | N/A | N/A | Non | Non | Non | Noindex correct | Aucun changement nécessaire | `Nouveau mot de passe` | `Choisis un nouveau mot de passe pour ton compte Grumm.` |
| `/profil` | Non | `Profil` | Page compte utilisateur | Aucune canonical dédiée | N/A | N/A | Non | Non | Non | Noindex correct | Garder privé/noindex | `Profil Grumm` | `Espace personnel Grumm réservé aux utilisateurs connectés.` |
| `/profile` | Non | `Profil` | Alias compte utilisateur | Redirection vers `/profil` | N/A | N/A | Non | Non | Non | Route anglaise héritée | Redirection/noindex conservés | `Profil Grumm` | `Route héritée redirigée vers le profil français.` |
| `/profil/edit` | Non | `Modifier le profil` | Page compte utilisateur | Aucune canonical dédiée | N/A | N/A | Non | Non | Non | Noindex via layout profil | Correct | `Modifier le profil Grumm` | `Page privée de modification du profil Grumm.` |
| `/saved` | Non | Route absente | N/A | N/A | N/A | N/A | Non | Non | Non | Route inexistante | Robots disallow ajouté par précaution | `Faits enregistrés` | `Page privée éventuelle pour les faits enregistrés.` |
| `/admin/**` | Non | Admin | Admin TailAdmin | N/A | N/A | N/A | Non | Non | Non | Privé | Noindex + robots disallow conservés | `Admin Grumm` | `Espace d'administration privé.` |

## Vérification Des Faits

Les pages `/fait/[slug]` utilisent :

- canonical : `https://grumm.fr/fait/[slug]`
- Open Graph URL : `https://grumm.fr/fait/[slug]`
- Open Graph image : `https://grumm.fr/fait/[slug]/opengraph-image`
- Twitter image : `https://grumm.fr/fait/[slug]/opengraph-image`
- JSON-LD `Article.mainEntityOfPage` : `https://grumm.fr/fait/[slug]`

La route héritée `/fact/[slug]` est redirigée vers `/fait/[slug]`.

## Sitemap

Inclus :

- `/`
- `/a-propos`
- `/decouvrir`
- `/theme`
- `/theme/[slug]`
- `/quiz`
- `/quiz/general`
- `/aujourdhui`
- `/contact`
- `/politique-confidentialite`
- `/mentions-legales`
- `/fait/[slug]`

Exclus :

- `/admin/**`
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/profil/**`
- `/profile/**`
- `/saved/**`
- `/quiz/memoire`
- routes anglaises ou héritées redirigées

## Recommandations Prioritaires

1. Ajouter une image Open Graph globale pour les pages statiques.
2. Générer une image OG dynamique pour les pages thèmes.
3. Ajouter un JSON-LD `Organization` global sur la page d'accueil ou le layout.
4. Rediriger éventuellement `/facts` vers `/decouvrir` au lieu de simplement noindex si cette route n'est plus utile.
5. Maintenir les pages légales à jour selon l'hébergeur et les outils analytics réellement utilisés.
