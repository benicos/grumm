import React from "react";

export default function VeloraHomepage() {
  const previewCards = [
    {
      category: "Psychologie",
      hook: "Ton cerveau prend des décisions avant toi.",
    },
    {
      category: "Science",
      hook: "Ton corps produit naturellement une drogue puissante.",
    },
    {
      category: "Histoire",
      hook: "Le silence pouvait sauver des vies pendant certaines guerres.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#050816] text-white overflow-hidden selection:bg-cyan-400/30">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-violet-500/20 blur-3xl rounded-full" />
        <div className="absolute bottom-[-250px] right-[-150px] w-[600px] h-[600px] bg-cyan-400/15 blur-3xl rounded-full" />
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      {/* Navbar */}
      <header className="relative z-50 border-b border-white/10 backdrop-blur-md bg-black/60">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-[-0.06em] bg-gradient-to-r from-cyan-300 via-white to-violet-300 text-transparent bg-clip-text">
              Velora
            </h1>
            <p className="text-xs text-cyan-100/50 mt-1 tracking-wide">
              La culture qui se scrolle.
            </p>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#concept" className="hover:text-white transition">
              Concept
            </a>
            <a href="#experience" className="hover:text-white transition">
              Expérience
            </a>
            <a href="#preview" className="hover:text-white transition">
              Aperçu
            </a>
          </nav>

          <button className="px-5 py-2 rounded-full bg-white text-black text-sm font-medium hover:opacity-90 transition">
            Découvrir
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 min-h-[92vh] flex items-center">
        <div className="max-w-7xl mx-auto w-full px-6 grid lg:grid-cols-2 gap-20 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 text-sm text-cyan-200/80 mb-8 shadow-[0_0_30px_rgba(34,211,238,0.08)]">
              ⚡ Curiosité moderne
            </div>

            <h2 className="text-5xl md:text-7xl font-black tracking-[-0.07em] leading-[0.92] mb-8">
              Le scroll peut aussi
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-white to-violet-300 text-transparent bg-clip-text">
                enrichir ton esprit.
              </span>
            </h2>

            <p className="text-lg md:text-xl text-slate-300/80 leading-relaxed max-w-xl mb-10 font-light">
              Velora transforme le réflexe du scroll en une expérience de
              découverte intelligente. Des idées courtes, mémorables et
              vérifiées à apprendre en quelques secondes.
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-12">
              <button className="px-7 py-4 rounded-2xl bg-gradient-to-r from-cyan-300 to-violet-300 text-black font-semibold hover:scale-[1.02] transition shadow-[0_0_40px_rgba(34,211,238,0.15)]">
                Commencer à explorer
              </button>

              <button className="px-7 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-slate-200/80 backdrop-blur-md">
                Voir le concept
              </button>
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-white/40">
              <div>✓ Une idée par écran</div>
              <div>✓ Sources vérifiées</div>
              <div>✓ Scroll immersif</div>
            </div>
          </div>

          {/* Right */}
          <div className="relative flex justify-center">
            <div className="relative w-[320px] h-[650px] rounded-[42px] border border-cyan-400/10 bg-white/[0.03] backdrop-blur-2xl overflow-hidden shadow-[0_0_80px_rgba(34,211,238,0.08)] before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.05] before:to-transparent">
              {/* App Header */}
              <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-black/30 backdrop-blur-md">
                <div>
                  <h3 className="font-black tracking-[-0.05em] text-lg bg-gradient-to-r from-cyan-300 to-violet-300 text-transparent bg-clip-text">Velora</h3>
                  <p className="text-xs text-white/40">
                    La culture qui se scrolle.
                  </p>
                </div>

                <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                  🔥 7 jours
                </div>
              </div>

              {/* Fake Feed */}
              <div className="h-full overflow-hidden p-5 flex flex-col gap-5">
                {previewCards.map((card, index) => (
                  <div
                    key={index}
                    className={`rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition-all ${
                      index === 0
                        ? "scale-100 opacity-100"
                        : "scale-[0.96] opacity-60"
                    }`}
                  >
                    <div className="inline-flex items-center rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-violet-200/70 mb-5">
                      {card.category}
                    </div>

                    <h4 className="text-2xl leading-tight font-black tracking-[-0.05em] text-white">
                      {card.hook}
                    </h4>
                  </div>
                ))}
              </div>

              {/* Bottom Nav */}
              <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-black/50 backdrop-blur-md px-6 py-4 flex items-center justify-around text-white/70">
                <div className="flex flex-col items-center gap-1 text-white">
                  <span>🏠</span>
                  <span className="text-[11px]">Feed</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <span>🔖</span>
                  <span className="text-[11px]">Sauvegardes</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <span>👤</span>
                  <span className="text-[11px]">Profil</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Concept */}
      <section
        id="concept"
        className="relative z-10 border-t border-white/10"
      >
        <div className="max-w-6xl mx-auto px-6 py-28">
          <div className="max-w-3xl mb-20">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/40 mb-6">
              Concept
            </p>

            <h3 className="text-4xl md:text-5xl font-black tracking-[-0.06em] leading-[1] mb-8">
              Une nouvelle façon de consommer du contenu.
            </h3>

            <p className="text-xl text-slate-300/75 leading-relaxed font-light">
              Aujourd’hui, des millions de personnes passent des heures à
              scroller du contenu oubliable. Velora garde cette fluidité, mais
              transforme chaque swipe en une découverte utile, mémorable et
              enrichissante.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-8 backdrop-blur-xl hover:border-cyan-400/20 transition">
              <div className="text-3xl mb-6">🧠</div>
              <h4 className="text-2xl font-semibold mb-4">
                Une idée à la fois
              </h4>
              <p className="text-white/60 leading-relaxed">
                Chaque carte se concentre sur une seule idée forte pour rester
                simple, rapide et mémorable.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
              <div className="text-3xl mb-6">📚</div>
              <h4 className="text-2xl font-semibold mb-4">
                Des sources vérifiées
              </h4>
              <p className="text-white/60 leading-relaxed">
                Le contenu est pensé pour être crédible, sourcé et réellement
                utile dans la vie quotidienne.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
              <div className="text-3xl mb-6">⚡</div>
              <h4 className="text-2xl font-semibold mb-4">
                Une expérience fluide
              </h4>
              <p className="text-white/60 leading-relaxed">
                Pas de surcharge, pas de commentaires inutiles, juste une
                découverte continue et immersive.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
