"use client";

import { useParams } from "next/navigation";
import FactFeed from "../../../faits/FactFeed";

export default function DiscoverThemePage() {
  const params = useParams<{ themeSlug: string }>();

  return <FactFeed themeSlug={params.themeSlug} />;
}
