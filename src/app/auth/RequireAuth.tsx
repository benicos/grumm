"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { rememberAuthRedirect } from "@/lib/authRedirect";
import { useAuth } from "./AuthProvider";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      rememberAuthRedirect(currentPath);
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#050b13] px-6 text-white">
        <div className="w-full max-w-sm rounded-lg border border-white/10 bg-white/[0.055] p-6 shadow-2xl backdrop-blur-xl">
          <div className="h-3 w-28 rounded-full bg-white/10" />
          <div className="mt-5 h-8 w-48 rounded-full bg-white/10" />
          <div className="mt-8 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-[#ffd166]" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#050b13] px-6 text-center text-white">
        <div className="max-w-sm rounded-lg border border-white/10 bg-white/[0.055] p-6 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffd166]">
            Connexion requise
          </p>
          <h1 className="mt-4 text-2xl font-extrabold tracking-[-0.04em]">
            Redirection vers ton compte.
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/62">
            Cette page contient des donnees personnelles.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
