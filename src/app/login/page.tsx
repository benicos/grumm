import type { Metadata } from "next";
import { Inter } from "next/font/google";
import HeroBackground from "../components/HeroBackground";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AuthForm from "../auth/AuthForm";
import { premiumTitleGradientClassName } from "../components/buttonStyles";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
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
          <h1 className={`${premiumTitleGradientClassName} mt-4 text-[clamp(2.5rem,6vw,4.8rem)] font-extrabold leading-none`}>
            Continue là où ta curiosité s’est arrêtée.
          </h1>
        </div>
        <div className="flex justify-center lg:justify-end">
          <AuthForm mode="login" />
        </div>
      </section>
      <Footer />
    </main>
  );
}
