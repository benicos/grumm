import {
  createGrummOgImage,
  grummOgImageContentType as contentType,
  grummOgImageSize as size,
} from "@/lib/ogImage";

export { contentType, size };

export default function Image() {
  return createGrummOgImage({
    accent: "#f59e6b",
    description: "Retrouve les faits culturels lies a la date du jour et comprends ce qui s'est joue aujourd'hui.",
    subtitle: "Aujourd'hui dans l'Histoire",
    title: "Aujourd’hui",
  });
}
