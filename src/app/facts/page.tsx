import type { Metadata } from "next";
import FactFeed from "../discover/FactFeed";

export const metadata: Metadata = {
  title: "Faits",
  description: "Découvrir les faits Grumm dans le flux principal.",
};

export default function FactsPage() {
  return <FactFeed />;
}
