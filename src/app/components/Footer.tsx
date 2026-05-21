import Link from "next/link";
import { footerLinks, siteConfig } from "@/config/app";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-[#07111f]/72 text-white backdrop-blur-xl">
      <div className="mx-auto grid w-full max-w-[1180px] gap-8 px-6 py-10 sm:grid-cols-[minmax(0,1fr)_auto] lg:px-8">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-[1.05rem] font-extrabold tracking-[-0.04em]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-gradient-to-br from-[#ffd166] to-[#6ae3c0] font-black text-[#06111d] shadow-[0_10px_30px_rgba(255,209,102,0.18)]">
              G
            </span>
            <span>{siteConfig.name}</span>
          </Link>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/58 mx-auto">
            {siteConfig.description}
          </p>
        </div>

        <nav className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm font-semibold text-white/62 sm:flex sm:flex-wrap sm:justify-end">
          {footerLinks.map((link) =>
            "external" in link && link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-white"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="transition hover:text-white"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </footer>
  );
}
