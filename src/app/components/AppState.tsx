import Link from "next/link";

type AppStateProps = {
  eyebrow?: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function AppState({
  eyebrow = "Velora",
  title,
  description,
  primaryHref = "/",
  primaryLabel = "Retour accueil",
  secondaryHref = "/discover",
  secondaryLabel = "Découvrir",
}: AppStateProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#132338] px-6 py-20 text-white">
      <section className="relative w-full max-w-xl overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.055] p-8 text-center shadow-[0_30px_120px_rgba(0,0,0,0.42)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,209,102,0.18),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ffd166]">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-[-0.045em] sm:text-5xl">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/62 sm:text-base">
            {description}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={primaryHref}
              className="rounded-[14px] bg-[#ffd166] px-5 py-3 text-sm font-extrabold text-[#07111f] transition hover:bg-[#ffe08f]"
            >
              {primaryLabel}
            </Link>
            {secondaryHref && (
              <Link
                href={secondaryHref}
                className="rounded-[14px] border border-white/10 px-5 py-3 text-sm font-bold text-white/72 transition hover:border-white/20 hover:text-white"
              >
                {secondaryLabel}
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export function FeedSkeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center overflow-hidden bg-[#132338] px-5">
      <div className="relative flex h-full w-full max-w-6xl flex-col pb-24 pt-36">
        <div className="h-8 w-36 animate-pulse rounded-full bg-white/10" />
        <div className="flex flex-1 items-center py-7">
          <div className="w-full max-w-3xl space-y-4">
            <div className="h-12 w-11/12 animate-pulse rounded-full bg-white/10 sm:h-16" />
            <div className="h-12 w-8/12 animate-pulse rounded-full bg-white/10 sm:h-16" />
            <div className="mt-8 h-5 w-10/12 animate-pulse rounded-full bg-white/10" />
            <div className="h-5 w-7/12 animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
        <div className="w-full max-w-2xl">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
            <div className="h-3 w-12 animate-pulse rounded-full bg-white/10" />
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 animate-[shimmer_1.8s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-[#ffd166] to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
