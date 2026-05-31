"use client";

import { useSearchParams } from "next/navigation";
import FactFeed from "../discover/FactFeed";

export default function DecouvrirClient() {
  const searchParams = useSearchParams();
  const themeSlug = searchParams.get("theme")?.trim() || undefined;

  return <FactFeed themeSlug={themeSlug} />;
}
