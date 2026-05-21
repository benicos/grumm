import type { Metadata } from "next";
import { Inter } from "next/font/google";
import HeroBackground from "../components/HeroBackground";
import Navbar from "../components/Navbar";
import AuthForm from "../auth/AuthForm";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Connexion",
};

export default function LoginPage() {
  return (
    <main
      className={`${inter.className} relative min-h-screen overflow-hidden bg-[#07111f] text-white`}
    >
      <HeroBackground />
      <Navbar />
      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-96px)] w-full max-w-[1080px] items-center gap-10 px-6 py-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(380px,440px)] lg:px-8">
        <div className="max-w-xl text-center lg:text-left">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ffd166]">
            Connexion
          </p>
          <h1 className="mt-4 bg-[linear-gradient(120deg,#ffffff,#ffe4a1_45%,#6ae3c0)] bg-clip-text text-[clamp(2.5rem,6vw,4.8rem)] font-extrabold leading-none text-transparent">
            Continue là où ta curiosité s’est arrêtée.
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-base font-semibold leading-8 text-white/62 lg:mx-0">
            Ton profil Grumm garde tes lectures, tes sauvegardes et ta
            progression sans ajouter de friction au parcours.
          </p>
        </div>
        <div className="flex justify-center lg:justify-end">
          <AuthForm mode="login" />
        </div>
      </section>
    </main>
  );
}
