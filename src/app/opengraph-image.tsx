import {
  createGrummOgImage,
  grummOgImageContentType as contentType,
  grummOgImageSize as size,
} from "@/lib/ogImage";

export { contentType, size };

export default function Image() {
  return createGrummOgImage({
    accent: "#d9c39a",
    description: "Des faits courts, memorables et relies pour nourrir ta culture chaque jour.",
    subtitle: "La culture qui se scrolle.",
    title: "Grumm.",
  });
}
