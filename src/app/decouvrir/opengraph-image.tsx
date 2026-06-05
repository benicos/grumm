import {
  createGrummOgImage,
  grummOgImageContentType as contentType,
  grummOgImageSize as size,
} from "@/lib/ogImage";

export { contentType, size };

export default function Image() {
  return createGrummOgImage({
    accent: "#6ae3c0",
    description: "Fais defiler des faits courts, surprenants et faciles a retenir.",
    subtitle: "Le flux culturel",
    title: "Découvrir",
  });
}
