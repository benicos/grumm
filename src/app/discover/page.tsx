import type { Metadata } from "next";
import { buildDefaultMetadata } from "@/lib/serverMetadata";
import FactFeed from "./FactFeed";

export const metadata: Metadata = buildDefaultMetadata({
  canonicalPath: "/decouvrir",
  description: "Le flux Grumm pour apprendre un fait court et mémorable.",
  noindex: true,
  title: "Découvrir",
});

export default function DiscoverPage() {
  return <FactFeed />;
}
