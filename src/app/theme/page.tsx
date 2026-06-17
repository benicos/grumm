import type { Metadata } from "next";
import { buildDefaultMetadata } from "@/lib/serverMetadata";
import ExplorerExperience from "../components/ExplorerExperience";

export const metadata: Metadata = buildDefaultMetadata({
  canonicalPath: "/theme",
  imagePath: "/theme/opengraph-image",
  description:
    "Explore les thèmes et portes d'entrée culturelles de Grumm",
  title: "Explorer",
});

export default ExplorerExperience;
