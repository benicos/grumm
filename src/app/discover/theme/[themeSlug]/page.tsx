"use client";

import { useParams } from "next/navigation";
import FactFeed from "../../FactFeed";

export default function DiscoverThemePage() {
  const params = useParams<{ themeSlug: string }>();

  return <FactFeed themeSlug={params.themeSlug} />;
}
