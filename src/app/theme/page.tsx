import type { Metadata } from "next";
import Link from "next/link";
import { buildThemeMetadata, getPublicThemesForSeo } from "@/lib/serverMetadata";
import Footer from "../components/Footer";
import HeroBackground from "../components/HeroBackground";
import Navbar from "../components/Navbar";
import {
  premiumPrimaryCtaClassName,
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
          <h1 className={`${premiumTitleGradientClassName} mt-5 text-[clamp(3rem,7vw,5.8rem)] font-extrabold leading-[0.95]`}>
            Explorer par univers.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
            Chaque thème ouvre une porte éditoriale : des repères courts,
            lisibles, et assez riches pour nourrir la curiosité sans alourdir
            l’expérience.
          </p>
          <Link href="/decouvrir" className={`${premiumPrimaryCtaClassName} mt-8 inline-flex`}>
            Ouvrir le flux
          </Link>
        </section>

        <section className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((theme) => (
            <Link
              key={theme.id}
              href={`/theme/${theme.slug}`}
              className={`group min-h-[230px] rounded-[28px] border border-white/10 bg-gradient-to-br ${theme.tone ?? "from-[#111827] via-[#1f2937] to-[#334155]"} p-7 shadow-[0_28px_80px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-1 hover:border-white/20`}
            >
              <div className="flex h-full flex-col justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/55">
                    {theme.factsCount ?? 0} faits
                  </p>
                  <h2 className="mt-5 text-3xl font-black tracking-[-0.04em]">
                    {theme.name}
                  </h2>
                </div>
                <p className="mt-8 max-w-[24ch] text-sm leading-6 text-white/70">
                  Entrer dans ce thème et retrouver les faits associés.
                </p>
              </div>
            </Link>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}
