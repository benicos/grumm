import type { Metadata } from "next";
import { Suspense } from "react";
import { buildDefaultMetadata } from "@/lib/serverMetadata";
import DecouvrirClient from "./DecouvrirClient";

export const metadata: Metadata = buildDefaultMetadata({
  canonicalPath: "/decouvrir",
  imagePath: "/decouvrir/opengraph-image",
  description:
    "Découvre un flux de faits courts, culturels et mémorables sur Grumm.",
  title: "Découvrir",
});

export default function DecouvrirPage() {
  return (
    <>
      <h1 className="sr-only">Faits culturels et anecdotes à découvrir</h1>
      <Suspense>
        <DecouvrirClient />
      </Suspense>
    </>
  );
}
