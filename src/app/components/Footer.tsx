import Link from "next/link";
import { appRoutes, siteConfig } from "@/config/app";

const footerLinks = [
  { href: appRoutes.about, label: "À propos" },
  { href: appRoutes.contact, label: "Contact" },
  { href: appRoutes.privacy, label: "Confidentialité" },
  { href: appRoutes.legalNotice, label: "Mentions légales" },
] as const;

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-[#07111f]/82 text-white backdrop-blur-xl">
      <div className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-6 sm:py-9 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-3 text-[1.05rem] font-extrabold tracking-[-0.04em]"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-gradient-to-br from-[#ffd166] to-[#6ae3c0] font-black text-[#06111d] shadow-[0_10px_30px_rgba(255,209,102,0.18)]">
              G
            </span>
            <span>{siteConfig.name}</span>
          </Link>
          <p className="max-w-xl text-sm font-semibold leading-6 text-white/58 sm:text-right">
            Grumm est une plateforme de culture générale qui permet
            d&apos;apprendre chaque jour des faits marquants en histoire,
            science, art, géographie, cinéma et bien plus.
          </p>
        </div>

        <nav
          aria-label="Liens du pied de page"
          className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-white/10 pt-4 text-xs font-bold text-white/50 sm:justify-end"
        >
          {footerLinks.map((link, index) => (
            <span key={link.href} className="inline-flex items-center gap-2">
              {index > 0 ? <span aria-hidden="true">·</span> : null}
              <Link
                href={link.href}
                className="transition hover:text-white/80"
              >
                {link.label}
              </Link>
            </span>
          ))}
        </nav>
      </div>
    </footer>
  );
}
