import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { siteConfig } from "@/config/app";
import { premiumPrimaryCtaClassName } from "./components/buttonStyles";
import FactOfDay from "./components/FactOfDay";
import Footer from "./components/Footer";
import HeroBackground from "./components/HeroBackground";
import Navbar from "./components/Navbar";

export const metadata: Metadata = {
  title: {
    absolute: siteConfig.name,
  },
};

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default function VeloraLanding() {
  return (
    <div
      className={`${inter.className} relative min-h-screen overflow-x-hidden bg-[#132338] text-white`}
    >
      <HeroBackground />
      <Navbar />

      <main className="relative z-10">
        <section className="flex min-h-[92vh] items-center px-3 lg:px-5">
          <div className="mx-auto w-full max-w-[1180px]">
            <div className="inline-flex w-fit items-center rounded-full px-3 py-1 text-sm/6 text-[#ffd166] ring-1 ring-white/10 hover:ring-white/20">
              Scroll. Learn. Grow.
            </div>
            <h1 className="mt-8 text-[clamp(3.2rem,7vw,5.9rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-white">
              La culture qui se <span className="text-[#ffd166]">scrolle</span>.
            </h1>

            <p className="mt-8 max-w-[620px] text-lg font-medium leading-8 text-gray-400">
              VELORA transforme la curiosité en réflexe. Une plateforme pensée
              pour apprendre vite, retenir facilement et découvrir des faits
              que vous aurez réellement envie de raconter.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link
                href="/discover"
                className={premiumPrimaryCtaClassName}
              >
                Découvrir
              </Link>
            </div>
          </div>
        </section>

        <FactOfDay />

        <section className="py-[110px]">
          <div className="mx-auto max-w-[1180px] px-5">
            <div className="mb-[52px]">
              <span className="mb-[14px] inline-block text-[0.82rem] font-bold uppercase tracking-[0.08em] text-[#ffd166]">
                Le concept
              </span>

              <h2 className="mb-[18px] text-[clamp(2rem,5vw,4rem)] font-bold leading-none tracking-[-0.05em]">
                Une plateforme pensée pour la curiosité moderne.
              </h2>

              <p className="max-w-[720px] text-[#94a6c7]">
                Le genre de choses qu&apos;on aime raconter ensuite.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: "01",
                  title: "Découvrir",
                  text: "Un flux de découvertes courtes et surprenantes. Une idée à la fois, sans distraction.",
                  href: "/discover",
                  alt: "Découvrir",
                },
                {
                  icon: "02",
                  title: "Explorer",
                  text: "Science, histoire, psychologie, espace, nature... Explorez les sujets qui vous intéressent vraiment.",
                  href: "/explorer",
                  alt: "Explorer",
                },
                {
                  icon: "03",
                  title: "Aller plus loin",
                  text: "Certaines découvertes méritent plus qu'un swipe. Approfondissez avec des contenus plus immersifs.",
                  href: "/#",
                  alt: "En savoir plus",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-[26px] border border-white/[0.08] bg-[rgba(17,27,44,0.82)] p-7 backdrop-blur-xl transition hover:-translate-y-[6px] hover:border-[rgba(255,209,102,0.24)]"
                >
                  <div className="mb-6 grid h-[54px] w-[54px] place-items-center rounded-[18px] bg-white/[0.06] text-[0.9rem] font-black text-[#ffd166]">
                    {card.icon}
                  </div>

                  <h3 className="mb-3 text-[1.4rem] font-semibold tracking-[-0.03em]">
                    {card.title}
                  </h3>

                  <p className="mb-6 leading-relaxed text-[#94a6c7]">
                    {card.text}
                  </p>

                  <Link
                    href={card.href}
                    className="font-semibold text-[#ffd166]"
                  >
                    {card.alt} -&gt;
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
