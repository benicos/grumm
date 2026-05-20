"use client";

import { useParams } from "next/navigation";
import FactFeed from "../../../discover/FactFeed";

export default function ThemeFactsPage() {
  const params = useParams<{ themeSlug: string }>();

  return <FactFeed themeSlug={params.themeSlug} />;
}
