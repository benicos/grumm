import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Brain, Compass, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { siteConfig } from "@/config/app";
import { buildDefaultMetadata } from "@/lib/serverMetadata";
import {
  premiumPrimaryCtaClassName,
  premiumTitleGradientClassName,
} from "./components/buttonStyles";
import FactOfDay from "./components/FactOfDay";
import Footer from "./components/Footer";
import HeroBackground from "./components/HeroBackground";
import Navbar from "./components/Navbar";

export const metadata: Metadata = {
  ...buildDefaultMetadata({
    canonicalPath: "/",
    description: siteConfig.description,
    imagePath: "/opengraph-image",
    title: siteConfig.name,
  }),
  title: {
    absolute: siteConfig.name,
  },
};

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const conceptCards: {
  accent: string;
  accentSoft: string;
  alt: string;
  href: string;
  icon: LucideIcon;
  title: string;
  text: string;
}[] = [
  {
    accent: "#6ae3c0",
    accentSoft: "rgba(106,227,192,0.14)",
    alt: "D\u00e9couvrir",
    href: "/decouvrir",
    icon: Sparkles,
    title: "D\u00e9couvrir",
    text: "Un flux de d\u00e9couvertes courtes et surprenantes. Une id\u00e9e \u00e0 la fois, sans distraction.",
  },
  {
    accent: "#b99cff",
    accentSoft: "rgba(185,156,255,0.14)",
    alt: "Explorer",
    href: "/theme",
    icon: Compass,
    title: "Explorer",
    text: "Science, histoire, psychologie, espace, nature... Explorez les sujets qui vous int\u00e9ressent vraiment.",
  },
  {
    accent: "#ffb45f",
    accentSoft: "rgba(255,180,95,0.14)",
    alt: "Quiz",
    href: "/quiz",
    icon: Brain,
    title: "Aller plus loin",
    text: "Teste tes connaissances rapidement avec les quiz.",
  },
];

export default function GrummLanding() {
  return (
    <div
      className={`${inter.className} relative min-h-screen overflow-x-hidden bg-[#07111f] text-white`}
    >
      <HeroBackground />
      <Navbar />

      <main className="relative z-10">
        <section className="flex min-h-[88vh] items-center px-5 pb-10 pt-8 lg:px-8">
          <div className="mx-auto flex w-full max-w-[980px] flex-col items-center text-center">
            <div className="inline-flex w-fit items-center rounded-full border border-[#ffd166]/20 bg-[#ffd166]/10 px-4 py-2 text-sm/6 font-extrabold text-[#ffe4a1] shadow-[0_12px_42px_rgba(255,209,102,0.16)] backdrop-blur-xl">
              Scroll. Learn. Grow.
            </div>
            <h1 className={`${premiumTitleGradientClassName} mt-8 max-w-[12ch] text-[clamp(3.1rem,8vw,6.7rem)] font-extrabold leading-[0.94] [text-wrap:balance]`}>
              La culture qui se scrolle.
            </h1>

            <p className="mt-7 max-w-[720px] text-[1.05rem] font-semibold leading-8 text-white/72 sm:text-xl sm:leading-9">
              <span className="text-white">{"Grumm. transforme la curiosit\u00e9 en r\u00e9flexe."}</span>{" "}<br />
              {"Une plateforme pens\u00e9e pour apprendre sans contraintes."}
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
              <Link
                href="/decouvrir"
                className={`${premiumPrimaryCtaClassName} grumm-home-cta min-h-[62px] rounded-[22px] px-11 text-base shadow-2xl ring-1 ring-[#ffd166]/25`}
              >
                {"D\u00e9marrer"}
              </Link>
            </div>

            <div className="mt-7 flex items-center justify-center gap-3 text-xs font-extrabold uppercase tracking-[0.18em] text-white/52">
              <span className="grid h-10 w-6 place-items-start rounded-full border border-white/18 bg-white/[0.045] p-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.18)] backdrop-blur-xl">
                <span className="grumm-scroll-float block h-2.5 w-full rounded-full bg-gradient-to-b from-[#ffd166] to-[#6ae3c0]" />
              </span>
              <span>{"Un fait apr\u00e8s l'autre"}</span>
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
                {"Une plateforme pens\u00e9e pour la curiosit\u00e9 moderne."}
              </h2>

              <p className="max-w-[720px] text-[#94a6c7]">
                Le genre de choses qu&apos;on aime raconter ensuite.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {conceptCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.title}
                    className="flex h-full flex-col rounded-[26px] border border-white/[0.08] bg-[rgba(17,27,44,0.82)] p-7 backdrop-blur-xl transition hover:-translate-y-[6px]"
                  >
                    <div className="flex-1">
                      <div
                        className="mb-6 grid h-[54px] w-[54px] place-items-center rounded-[18px] border"
                        style={{
                          backgroundColor: card.accentSoft,
                          borderColor: `${card.accent}44`,
                          color: card.accent,
                        }}
                      >
                        <Icon
                          className="h-6 w-6"
                          aria-hidden="true"
                          strokeWidth={2.3}
                        />
                      </div>

                      <h3 className="mb-3 text-[1.4rem] font-semibold tracking-[-0.03em]">
                        {card.title}
                      </h3>

                      <p className="leading-relaxed text-[#94a6c7]">
                        {card.text}
                      </p>
                    </div>

                    <div className="mt-7">
                      <Link
                        href={card.href}
                        className="font-semibold"
                        style={{ color: card.accent }}
                      >
                        {card.alt} -&gt;
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
