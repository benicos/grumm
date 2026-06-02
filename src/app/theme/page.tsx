import type { Metadata } from "next";
import Link from "next/link";
import { buildThemeMetadata, getPublicThemesForSeo } from "@/lib/serverMetadata";
import ThemeCard from "../components/ThemeCard";
import Footer from "../components/Footer";
import HeroBackground from "../components/HeroBackground";
import Navbar from "../components/Navbar";
import {
  premiumTitleGradientClassName,
} from "../components/buttonStyles";

export const metadata: Metadata = buildThemeMetadata(null);

export default async function ThemeHubPage() {
  const themes = await getPublicThemesForSeo();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#07111f] text-white">
      <HeroBackground />
      <Navbar />
      <main className="relative z-10 mx-auto max-w-[1180px] px-5 pb-24 pt-16 lg:px-8">
        <section className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#ffe4a1]/80">
            Thèmes
          </p>
          <h1
            className={`${premiumTitleGradientClassName} mt-5 text-[clamp(2.5rem,6vw,4.8rem)] font-extrabold leading-[0.98]`}
          >
            Explore les grands{" "}
            <span className="text-[#ffd166]">thèmes</span> de la culture.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
            Chaque thème rassemble des faits courts, mémorables et reliés entre
            eux pour apprendre sans se perdre.
          </p>
          <Link
            href="/decouvrir"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-[#ffd166] to-[#f4ead5] px-5 text-sm font-black text-[#07111f] shadow-[0_18px_55px_rgba(255,209,102,0.20)] transition hover:scale-[1.02]"
          >
            Commencer par un fait au hasard
          </Link>
        </section>

        <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((theme) => (
            <ThemeCard key={theme.id} theme={theme} />
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}
