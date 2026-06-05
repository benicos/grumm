import {
  createGrummOgImage,
  grummOgImageContentType as contentType,
  grummOgImageSize as size,
} from "@/lib/ogImage";

export { contentType, size };

export default function Image() {
  return createGrummOgImage({
    accent: "#8fb7ff",
    description: "Explore les grands territoires de la culture et lance un flux dedie a tes sujets preferes.",
    subtitle: "Themes et univers",
    title: "Explorer",
  });
}
