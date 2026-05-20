import type { Metadata } from "next";
import FactFeed from "../discover/FactFeed";

export const metadata: Metadata = {
  title: "Découvrir",
  description: "Le flux Velora pour apprendre un fait court et mémorable.",
};

export default function FactsPage() {
  return <FactFeed />;
}
