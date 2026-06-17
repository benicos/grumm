import type { Metadata } from "next";
import { Brain, ChevronRight, Sparkles, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { buildDefaultMetadata } from "@/lib/serverMetadata";
import {
  premiumPrimaryCtaClassName,
} from "../components/buttonStyles";
import Footer from "../components/Footer";
import HeroBackground from "../components/HeroBackground";
import Navbar from "../components/Navbar";
import QuizStatsPanel from "./QuizStatsPanel";

export const metadata: Metadata = buildDefaultMetadata({
  canonicalPath: "/quiz",
  imagePath: "/quiz/opengraph-image",
  description:
    "Choisis ton expérience de quiz Grumm : quiz général ou défi mémoire personnalisé.",
  title: "Grumm Quiz",
});

const quizEntries = [
  {
    Icon: Zap,
    accent: "#a78bfa",
    cta: "Lancer le quiz général",
    description:
      "Lance une série rapide de questions variées et vois ce que tu retiens vraiment.",
    href: "/quiz/general#quiz-container",
    kicker: "Quiz général",
    tone: "from-[#a78bfa]/20 via-[#ff9f43]/10 to-transparent",
    title: "Envie de tester ta culture générale ?",
  },
  {
    Icon: Brain,
    accent: "#6ae3c0",
    cta: "Lancer le défi mémoire",
    description:
      "Revois les faits que tu as déjà lus avec une session personnalisée, courte et ciblée.",
    href: "/quiz/memoire#quiz-container",
    kicker: "Défi mémoire",
    tone: "from-[#6ae3c0]/20 via-[#143f57]/16 to-transparent",
    title: "Envie de réviser ce que tu as déjà lu ?",
  },
] as const;

export default function QuizHubPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#07111f] text-white">
      <HeroBackground />
      <Navbar />
      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-92px)] w-full max-w-[1120px] flex-col px-5 pb-12 pt-3 sm:px-6 sm:pt-7 lg:px-8">
        <section className="mx-auto grid w-full max-w-5xl gap-4 rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_88%_8%,rgba(106,227,192,0.12),transparent_28%),linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))] p-4 shadow-[0_20px_76px_rgba(0,0,0,0.2)] backdrop-blur-2xl sm:p-5 md:grid-cols-[minmax(0,1fr)_136px] md:items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#6ae3c0]">
              <Trophy className="h-4 w-4" aria-hidden="true" />
              Grumm Quiz
            </p>
            <h1 className="mt-3 max-w-2xl text-[clamp(1.85rem,8vw,3.25rem)] font-black leading-[0.98] tracking-[-0.055em] text-white">
              Entraîne ta mémoire.
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/62 sm:text-base">
              Deux formats courts pour retenir ce que tu découvres et faire progresser ton avatar Grumm.
            </p>
          </div>
          <div className="relative mx-auto hidden h-32 w-32 place-items-center rounded-[32px] border border-white/10 bg-black/18 text-[#6ae3c0] shadow-[0_20px_72px_rgba(0,0,0,0.22)] md:grid">
            <div className="absolute inset-4 rounded-[24px] bg-[#6ae3c0]/10 blur-xl" />
            <Brain className="relative h-14 w-14" aria-hidden="true" />
            <Sparkles className="absolute right-6 top-5 h-4 w-4 text-[#ffd166]" aria-hidden="true" />
            <Zap className="absolute bottom-6 left-6 h-4 w-4 text-[#a78bfa]" aria-hidden="true" />
          </div>
        </section>

        <section className="mx-auto mt-5 grid w-full max-w-5xl gap-4 sm:mt-7">
          {quizEntries.map(({ Icon, accent, cta, description, href, kicker, title, tone }) => (
            <Link
              key={href}
              href={href}
              className="quiz-entry group relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.022))] p-5 shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:border-white/20 sm:p-6"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${tone} opacity-80 transition group-hover:opacity-100`}
              />
              <div
                className="absolute -right-16 -top-20 h-52 w-52 rounded-full opacity-30 blur-3xl transition duration-500 group-hover:scale-110"
                style={{ backgroundColor: accent }}
              />
              <div className="absolute -bottom-24 left-12 h-44 w-44 rounded-full bg-[#d24b63]/10 blur-3xl" />
              <div className="relative grid gap-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
                <span
                  className="grid h-14 w-14 place-items-center rounded-2xl border border-white/12 bg-black/18 shadow-[0_18px_60px_rgba(0,0,0,0.24)]"
                  style={{ color: accent }}
                >
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </span>
                <div>
                  <p
                    className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em]"
                    style={{ color: accent }}
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    {kicker}
                  </p>
                  <h2 className="mt-3 text-2xl font-black tracking-[-0.048em] text-white sm:text-3xl">
                    {title}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/62">
                    {description}
                  </p>
                </div>
                <span
                  className={`${premiumPrimaryCtaClassName} w-full justify-center md:w-auto`}
                >
                  {cta}
                  <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </section>

        <QuizStatsPanel />
      </main>
      <Footer />
    </div>
  );
}
