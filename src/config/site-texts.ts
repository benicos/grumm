// Textes d'interface publics. Les contenus qui décrivent une entité métier
// doivent rester en base, ces valeurs ne servent que de fallback ou de libellé UI.
export const publicSiteTexts = {
  // Utilisé quand une catégorie n'a pas encore de description éditoriale en base.
  themeDescriptionFallback:
    "Un thème à explorer à travers des faits courts, lisibles et mémorables.",
  // Utilisé quand une description longue est demandée mais absente en base.
  themeLongDescriptionFallback:
    "Un parcours de repères essentiels, de faits courts et de liens pour mieux comprendre ce sujet.",
  // Libellés de progression des cartes de thèmes.
  themeProgress: {
    empty: "Commencer ce thème",
    factsToExplore: "faits à explorer",
    fallback: "Un thème à découvrir",
    readSuffix: "découverts",
  },
  // Textes du partage de fait.
  share: {
    brandLine: "Découvert sur Grumm.",
    nativeUnavailable: "Partage natif indisponible. Lien copié.",
    previewUnavailable: "Aperçu indisponible.",
    imageDownloaded: "Image téléchargée.",
    imageReady: "Image prête à être partagée.",
    linkCopied: "Lien copié.",
    linkReady: "Lien prêt à être partagé.",
    title: "Génère une carte verticale prête à être partagée.",
    description:
      "Le titre et le contenu complet sont conservés ; la carte adapte sa densité au fait.",
  },
  // Repères visuels de fin du quiz mémoire.
  memoryResult: {
    correct: "retenu",
    wrong: "à revoir",
  },
} as const;
