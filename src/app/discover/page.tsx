import type { Metadata } from "next";
import FactFeed from "./FactFeed";

export const metadata: Metadata = {
  title: "Découvrir",
  description: "Le flux Grumm pour apprendre un fait court et mémorable.",
};

export default function DiscoverPage() {
  return <FactFeed />;
}
