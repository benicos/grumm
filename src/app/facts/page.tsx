import type { Metadata } from "next";
import { buildDefaultMetadata } from "@/lib/serverMetadata";
import FactFeed from "../discover/FactFeed";

export const metadata: Metadata = buildDefaultMetadata({
  canonicalPath: "/decouvrir",
  description: "Découvrir les faits Grumm dans le flux principal.",
  noindex: true,
  title: "Faits",
});

export default function FactsPage() {
  return <FactFeed />;
}
