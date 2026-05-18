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
  title: "Inscription",
};

export default function InscriptionPage() {
  return (
    <main
      className={`${inter.className} relative min-h-screen overflow-hidden bg-[#132338] text-white`}
    >
      <HeroBackground />
      <Navbar />
      <section className="relative z-10 flex min-h-[calc(100vh-96px)] items-center justify-center px-6 py-12">
        <AuthForm mode="signup" />
      </section>
    </main>
  );
}
