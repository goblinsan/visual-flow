/**
 * ChooseModeModal (#142)
 *
 * Welcoming entry screen shown on first load. Lets the user explore features,
 * choose a template category to start with, or jump into a blank canvas.
 */

export type DesignMode = "general" | "roblox";

export type WelcomeAction =
  | { type: 'blank' }
  | { type: 'explore' }
  | { type: 'template'; category: string };

const TEMPLATE_CATEGORIES = [
  {
    category: 'web',
    title: 'Web Design',
    description: 'Websites, dashboards, and landing pages.',
    icon: 'fa-solid fa-globe',
    gradient: 'from-blue-500 to-cyan-400',
    accent: 'border-blue-400/30 hover:border-blue-400/70',
  },
  {
    category: 'game',
    title: 'Game Design',
    description: 'HUDs, inventories, and game maps.',
    icon: 'fa-solid fa-gamepad',
    gradient: 'from-purple-500 to-pink-400',
    accent: 'border-purple-400/30 hover:border-purple-400/70',
  },
  {
    category: 'presentation',
    title: 'Presentation',
    description: 'Slide decks and visual storytelling.',
    icon: 'fa-solid fa-presentation-screen',
    gradient: 'from-amber-500 to-orange-400',
    accent: 'border-amber-400/30 hover:border-amber-400/70',
  },
];

export function ChooseModeModal({
  onSelect,
}: {
  onSelect: (action: WelcomeAction) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-950/95 via-slate-900/95 to-cyan-900/95 backdrop-blur-md">
      <div className="w-full max-w-2xl mx-4 animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg">
              <img src="/vizail-mark.svg" alt="Vizail" className="w-7 h-7" />
            </div>
            <h1 className="text-3xl font-bold tracking-wide text-white" style={{ fontFamily: '"Cal Sans", "Cal Sans Semibold", sans-serif' }}>
              Viz<span className="text-cyan-300">ai</span>l
            </h1>
          </div>
          <p className="text-white/60 text-sm">Design, prototype, and collaborate — all in one canvas.</p>
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {/* Template categories row */}
          <div>
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">Start from a template</p>
            <div className="grid grid-cols-3 gap-3">
              {TEMPLATE_CATEGORIES.map((cat) => (
                <button
                  key={cat.category}
                  onClick={() => onSelect({ type: 'template', category: cat.category })}
                  className={`group text-left rounded-xl border bg-white/[0.06] backdrop-blur-sm transition-all duration-200 p-4 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 hover:bg-white/[0.1] ${cat.accent}`}
                >
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${cat.gradient} flex items-center justify-center mb-3 shadow-md group-hover:shadow-lg transition-shadow`}>
                    <i className={`${cat.icon} text-white text-sm`} />
                  </div>
                  <div className="font-semibold text-white text-sm mb-1">{cat.title}</div>
                  <p className="text-[11px] text-white/50 leading-relaxed">{cat.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom row: Explore + Blank Canvas */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => onSelect({ type: 'explore' })}
              className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm hover:bg-white/[0.08] hover:border-cyan-400/40 transition-all duration-200 p-4 text-left focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-400 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow flex-shrink-0">
                <i className="fa-solid fa-compass text-white text-sm" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-white text-sm">Explore Vizail</div>
                <p className="text-[11px] text-white/50 leading-relaxed">Learn the tools and features.</p>
              </div>
            </button>

            <button
              onClick={() => onSelect({ type: 'blank' })}
              className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm hover:bg-white/[0.08] hover:border-white/30 transition-all duration-200 p-4 text-left focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            >
              <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow flex-shrink-0">
                <i className="fa-regular fa-file text-white text-sm" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-white text-sm">Blank Canvas</div>
                <p className="text-[11px] text-white/50 leading-relaxed">Start from scratch.</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
