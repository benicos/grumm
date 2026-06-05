import {
  createGrummOgImage,
  grummOgImageContentType as contentType,
  grummOgImageSize as size,
} from "@/lib/ogImage";

export { contentType, size };

export default function Image() {
  return createGrummOgImage({
    accent: "#ffd166",
    description: "Un quiz rapide pour tester ta culture generale et retenir les faits essentiels.",
    subtitle: "Quiz rapide",
    title: "Quiz général",
  });
}
