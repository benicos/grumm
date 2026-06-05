import {
  createGrummOgImage,
  grummOgImageContentType as contentType,
  grummOgImageSize as size,
} from "@/lib/ogImage";

export { contentType, size };

export default function Image() {
  return createGrummOgImage({
    accent: "#d9c39a",
    description: "Signaler une erreur, proposer un sujet ou echanger avec l'equipe Grumm.",
    subtitle: "Contact editorial",
    title: "Contact",
  });
}
