import {
  createGrummOgImage,
  grummOgImageContentType as contentType,
  grummOgImageSize as size,
} from "@/lib/ogImage";

export { contentType, size };

export default function Image() {
  return createGrummOgImage({
    accent: "#bda7ff",
    description: "Teste ta memoire, revise tes faits lus et transforme tes decouvertes en connaissances durables.",
    subtitle: "Mémorisation",
    title: "Grumm Quiz",
  });
}
