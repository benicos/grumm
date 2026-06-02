import type { Metadata } from "next";
import { buildDefaultMetadata } from "@/lib/serverMetadata";
import InfoPageShell from "../components/InfoPageShell";

export const metadata: Metadata = buildDefaultMetadata({
  canonicalPath: "/politique-confidentialite",
  description:
    "Politique de confidentialité Grumm : compte, progression, likes, sauvegardes, personnalisation du feed et analytics limités.",
  title: "Politique de confidentialité",
});

const sections = [
  {
    title: "Pourquoi cette politique existe",
    body: [
      "Grumm permet de découvrir, enregistrer et retenir des faits culturels. Pour faire fonctionner le service, certaines données sont nécessaires : compte utilisateur, préférences, progression, interactions et données techniques limitées.",
      "La règle suivie est simple : collecter peu, collecter utile, ne pas vendre les données et ne pas faire de suivi publicitaire.",
    ],
  },
  {
    title: "Responsable du traitement",
    body: [
      "Le responsable du traitement est l'éditeur du service Grumm. Les informations légales de l'éditeur sont indiquées ou à compléter dans les mentions légales.",
      "Pour toute demande liée aux données personnelles, vous pouvez écrire à contact@grumm.fr ou utiliser la page Contact.",
    ],
  },
  {
    title: "Données de compte",
    body: [
      "Lors de la création d'un compte, Grumm peut traiter l'adresse email, le pseudo, l'identifiant utilisateur Supabase, l'objectif quotidien, le niveau ou objectif culturel choisi, les préférences de profil et les informations nécessaires à l'authentification.",
      "Les mots de passe sont gérés par Supabase Auth. Grumm ne stocke pas les mots de passe en clair dans sa base applicative.",
    ],
  },
  {
    title: "Progression et personnalisation",
    body: [
      "Pour fournir les fonctionnalités du produit, Grumm enregistre notamment les faits lus, les likes, les sauvegardes, les objectifs quotidiens, les séries, les résultats du quiz mémoire et les thèmes consultés.",
      "Ces signaux peuvent être utilisés pour personnaliser le feed : favoriser les faits non vus, tenir compte du niveau choisi, proposer des thèmes proches de vos intérêts et éviter de répéter trop vite les mêmes contenus.",
    ],
  },
  {
    title: "Analytics et mesures d'usage",
    body: [
      "Grumm utilise des analytics internes limités pour comprendre l'usage du service : sessions, pages vues, recherches Explorer, lectures de faits, durée avant changement de fait, likes, sauvegardes, partages, clics sur les sources et objectifs atteints.",
      "Ces mesures servent à améliorer le produit, identifier les contenus utiles, repérer les recherches sans résultat et suivre la stabilité du service. Elles ne servent pas à créer un profil publicitaire.",
      "Le site utilise aussi Vercel Analytics pour des statistiques techniques et agrégées de consultation. Aucun service de session replay, d'enregistrement clavier, de fingerprinting ou de publicité comportementale n'a été identifié dans le code.",
    ],
  },
  {
    title: "Visiteurs non connectés",
    body: [
      "Un visiteur non connecté peut recevoir un identifiant anonyme stocké localement afin de mesurer l'usage global et d'améliorer l'expérience. Cet identifiant ne contient pas de nom, d'email ou de donnée directement identifiante.",
      "La mémoire de session du feed peut aussi retenir temporairement les faits déjà servis afin d'éviter les doublons pendant le scroll.",
    ],
  },
  {
    title: "Cookies et stockage local",
    body: [
      "Grumm peut utiliser le stockage local du navigateur pour conserver la session Supabase, un identifiant anonyme, des préférences techniques et une mémoire légère du feed.",
      "Dans l'application iOS, des informations équivalentes peuvent être stockées via AsyncStorage ou SecureStore selon les mécanismes utilisés par Supabase et l'application.",
    ],
  },
  {
    title: "Services techniques utilisés",
    body: [
      "Supabase est utilisé pour l'authentification, la base de données, les règles d'accès, la progression et la synchronisation des données.",
      "Vercel peut être utilisé pour l'hébergement du site, la livraison des pages et Vercel Analytics.",
      "Expo peut être utilisé pour le développement, le test et la distribution technique de l'application mobile.",
    ],
  },
  {
    title: "Durée de conservation",
    body: [
      "Les données de compte sont conservées tant que le compte existe, sauf obligation légale, besoin de sécurité ou demande de suppression applicable.",
      "Les données de progression et d'interaction peuvent être conservées pour maintenir l'expérience utilisateur. Les données analytics détaillées ont vocation à être supprimées ou agrégées lorsqu'elles ne sont plus nécessaires à l'amélioration du service.",
    ],
  },
  {
    title: "Sécurité",
    body: [
      "Grumm s'appuie sur Supabase Auth, les politiques RLS, la séparation des rôles, des accès administratifs limités et une collecte réduite des données.",
      "Aucun système n'est totalement exempt de risque. En cas d'incident nécessitant une notification, Grumm appliquera les obligations légales applicables.",
    ],
  },
  {
    title: "Vos droits",
    body: [
      "Conformément au RGPD, vous pouvez demander l'accès, la rectification, l'effacement, la limitation, l'opposition au traitement et, lorsque applicable, la portabilité de vos données.",
      "Une vérification raisonnable de l'identité peut être demandée afin d'éviter qu'un tiers accède à des données qui ne lui appartiennent pas.",
    ],
  },
  {
    title: "Contact",
    body: [
      "Pour toute question relative à la confidentialité, à la sécurité ou à l'exercice de vos droits, contactez contact@grumm.fr ou utilisez la page Contact.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <InfoPageShell
      eyebrow="Confidentialité"
      title="Une collecte limitée, utile et maîtrisée."
      intro="Grumm utilise les données nécessaires au fonctionnement du service, à la progression et à des analytics raisonnables. Les données ne sont pas vendues et ne servent pas à du ciblage publicitaire."
    >
      <div className="mb-8 rounded-[18px] border border-[#ffd166]/18 bg-[#ffd166]/10 p-4 text-sm font-semibold leading-6 text-[#ffe4a1]">
        Dernière mise à jour : 2 juin 2026.
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
