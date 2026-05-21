import type { Metadata } from "next";
import InfoPageShell from "../components/InfoPageShell";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité Grumm, données de compte, analytics internes et droits RGPD.",
};

const sections = [
  {
    title: "Introduction",
    body: [
      "Grumm est une plateforme de découverte de faits courts, mémorables et sourcés. Cette politique explique quelles données peuvent être traitées, pourquoi elles le sont et quels droits sont ouverts aux utilisateurs et visiteurs.",
      "Les données servent uniquement à faire fonctionner Grumm, sécuriser le service, personnaliser l’expérience et comprendre l’usage global du produit afin de l’améliorer.",
    ],
  },
  {
    title: "Responsable du traitement",
    body: [
      "Le responsable du traitement est l’éditeur du service Grumm. Les demandes relatives aux données personnelles peuvent être envoyées depuis la page Contact du site.",
      "Les informations d’identification administrative ou légale de l’éditeur peuvent être complétées dans les mentions légales si nécessaire.",
    ],
  },
  {
    title: "Données collectées",
    body: [
      "Grumm peut traiter l’adresse email, le pseudo, l’objectif quotidien, les paramètres de profil, les faits lus, aimés, enregistrés ou partagés, ainsi que les informations techniques strictement nécessaires au fonctionnement du compte et de la session.",
      "Grumm ne collecte pas de données sensibles au sens du RGPD, ne demande pas d’informations inutiles au service et ne cherche pas à identifier personnellement un visiteur anonyme.",
    ],
  },
  {
    title: "Données analytics",
    body: [
      "Grumm utilise un système analytics interne first-party. Il mesure des événements utiles comme l’ouverture du service, les pages vues, les recherches, les lectures de faits, les likes, les sauvegardes, les partages, les clics sur les sources et certaines actions administratives.",
      "L’identifiant anonyme grumm_anonymous_id est un UUID généré une seule fois et stocké localement. Il ne repose pas sur du fingerprinting et ne permet pas, à lui seul, d’identifier une personne.",
      "Aucune adresse IP n’est stockée en clair dans les tables analytics applicatives.",
    ],
  },
  {
    title: "Finalités du traitement",
    body: [
      "Les traitements ont pour finalités l’authentification, la gestion du compte, la sauvegarde des préférences, la progression de lecture, la sécurité, la modération, l’administration des contenus, la mesure interne d’audience et l’amélioration de l’expérience utilisateur.",
      "Les statistiques sont utilisées uniquement pour comprendre l’usage du service, détecter les contenus utiles, améliorer Grumm et piloter le produit.",
    ],
  },
  {
    title: "Base légale",
    body: [
      "Les traitements nécessaires au compte et aux fonctionnalités demandées reposent sur l’exécution du service. Les traitements liés à la sécurité reposent sur l’intérêt légitime de Grumm à protéger son service.",
      "Les analytics internes, limités, non publicitaires et non intrusifs, reposent sur l’intérêt légitime d’amélioration du service, dans le respect des principes de minimisation et de proportionnalité.",
    ],
  },
  {
    title: "Durée de conservation",
    body: [
      "Les données de compte sont conservées tant que le compte existe, sauf obligation légale ou nécessité de sécurité. Les données de progression et d’interaction peuvent être conservées pour maintenir l’historique utilisateur.",
      "Les données analytics sont conservées pour une durée raisonnable compatible avec leur finalité produit, puis supprimées ou agrégées lorsque leur conservation détaillée n’est plus nécessaire.",
    ],
  },
  {
    title: "Cookies et stockage local",
    body: [
      "Grumm peut utiliser le stockage local du navigateur pour conserver la session Supabase, l’identifiant anonyme analytics grumm_anonymous_id et certains états techniques nécessaires à l’expérience.",
      "Sur l’application iOS Expo, des informations équivalentes peuvent être stockées dans AsyncStorage. Ces éléments ne servent pas au tracking publicitaire.",
    ],
  },
  {
    title: "Utilisateurs connectés",
    body: [
      "Lorsqu’un utilisateur se connecte, les nouvelles sessions analytics peuvent être associées à son identifiant utilisateur afin de mesurer l’usage interne du service et la progression. L’ancien historique anonyme peut rester séparé.",
      "Les actions de lecture, like, sauvegarde et profil servent à fournir les fonctionnalités visibles dans l’application.",
    ],
  },
  {
    title: "Visiteurs anonymes",
    body: [
      "Un visiteur non connecté peut être associé à un UUID anonyme stocké localement. Cet identifiant ne contient pas de nom, email, numéro de téléphone, adresse IP en clair ou autre donnée directement identifiante.",
      "Grumm ne pratique pas de suivi cross-site et ne tente pas de réconcilier un visiteur anonyme par des méthodes invasives.",
    ],
  },
  {
    title: "Sécurité des données",
    body: [
      "Grumm applique des mesures raisonnables de sécurité : authentification Supabase, règles d’accès, séparation des droits administratifs, limitation des données collectées et absence de collecte intrusive.",
      "Aucun système ne peut garantir un risque zéro. En cas d’incident nécessitant une notification, Grumm appliquera les obligations légales applicables.",
    ],
  },
  {
    title: "Hébergement",
    body: [
      "Les données applicatives sont hébergées via Supabase. Le site web peut être hébergé via Vercel. L’application mobile est distribuée et testée via l’écosystème Expo lorsque pertinent.",
      "Ces prestataires agissent dans le cadre technique nécessaire à l’hébergement, au déploiement, à l’authentification et au fonctionnement du service.",
    ],
  },
  {
    title: "Services utilisés",
    body: [
      "Supabase est utilisé pour l’authentification, la base de données, les règles d’accès et la synchronisation des données.",
      "Vercel peut être utilisé pour l’hébergement et la livraison du site web.",
      "Expo peut être utilisé pour le développement, le test et la distribution technique de l’application mobile.",
    ],
  },
  {
    title: "Absence de revente et publicité",
    body: [
      "Grumm ne vend pas les données personnelles, ne les partage pas à des fins commerciales, ne crée pas de profil publicitaire et ne pratique pas de publicité comportementale.",
      "Grumm n’utilise pas de session replay, n’enregistre pas les frappes clavier, ne suit pas les mouvements de souris et ne recourt pas au fingerprinting.",
    ],
  },
  {
    title: "Droits RGPD",
    body: [
      "Conformément au RGPD, les personnes concernées peuvent demander l’accès, la rectification, l’effacement, la limitation, l’opposition au traitement et, lorsque applicable, la portabilité de leurs données.",
      "Une demande peut nécessiter une vérification raisonnable de l’identité afin d’éviter qu’un tiers accède à des données qui ne lui appartiennent pas.",
    ],
  },
  {
    title: "Modalités d’exercice des droits",
    body: [
      "Les demandes s’effectuent depuis la page Contact. Grumm répondra dans les délais prévus par la réglementation applicable, sous réserve des contraintes légales, techniques et de sécurité.",
      "Lorsqu’une suppression complète est demandée, certaines données peuvent être conservées temporairement si la loi l’exige ou si elles sont nécessaires à la défense de droits en cas de litige.",
    ],
  },
  {
    title: "Contact",
    body: [
      "Pour toute question relative à la confidentialité, à la sécurité ou à l’exercice des droits, utilisez la page Contact disponible dans le pied de page du site.",
    ],
  },
  {
    title: "Modifications de la politique",
    body: [
      "Grumm peut modifier cette politique pour refléter l’évolution du service, des traitements ou de la réglementation. La date de dernière mise à jour indique la version applicable.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <InfoPageShell
      eyebrow="Confidentialité"
      title="Une collecte limitée, utile et maîtrisée."
      intro="Grumm utilise les données strictement nécessaires au service, à la progression et à des analytics internes raisonnables. Aucune donnée n’est vendue, partagée à des fins commerciales ou utilisée pour créer un profil publicitaire."
    >
      <div className="mb-8 rounded-[18px] border border-[#ffd166]/18 bg-[#ffd166]/10 p-4 text-sm font-semibold leading-6 text-[#ffe4a1]">
        Dernière mise à jour : 21 mai 2026.
      </div>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-extrabold text-white">
              {section.title}
            </h2>
            <div className="mt-3 space-y-3">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </InfoPageShell>
  );
}
