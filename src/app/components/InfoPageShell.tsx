import { Inter } from "next/font/google";
import Link from "next/link";
import { appRoutes } from "@/config/app";
import Footer from "./Footer";
import HeroBackground from "./HeroBackground";
import Navbar from "./Navbar";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

type InfoPageShellProps = {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  intro: string;
};

export default function InfoPageShell({
  children,
  eyebrow,
  intro,
  title,
}: InfoPageShellProps) {
  return (
    <div
      className={`${inter.className} relative min-h-screen overflow-x-hidden bg-[#132338] text-white`}
    >
      <HeroBackground />
      <Navbar />
      <main className="relative z-10 mx-auto w-full max-w-[960px] px-6 py-12 sm:py-16 lg:px-8">
        <section className="mb-8">
          <p className="w-fit rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-sm/6 font-semibold text-white/62 backdrop-blur-xl">
            {eyebrow}
          </p>
          <h1 className="mt-5 max-w-4xl text-[clamp(2.4rem,6vw,5rem)] font-semibold leading-[0.96] tracking-[-0.055em]">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-white/62 sm:text-lg">
            {intro}
          </p>
        </section>

        <article className="space-y-6 rounded-lg border border-white/10 bg-white/[0.055] p-6 leading-7 text-white/68 shadow-2xl backdrop-blur-xl sm:p-8">
          {children}
        </article>

        <div className="mt-8">
          <Link
            href={appRoutes.discover}
            className="inline-flex rounded-[14px] border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white/72 transition hover:border-white/20 hover:text-white"
          >
            Retour à Découvrir
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
