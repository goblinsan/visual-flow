/**
 * ChooseModeModal (#142)
 *
 * Shown on first load (when no design mode has been chosen) to let the user pick
 * between General UI editing and Roblox UI editing.
 */

export type DesignMode = "general" | "roblox";

type ModeCard = {
  mode: DesignMode;
  title: string;
  description: string;
  cta: string;
};

const MODES: ModeCard[] = [
  {
    mode: "general",
    title: "General UI",
    description: "Design layouts for web, mobile or any platform using the flexible DSL canvas.",
    cta: "Start with blank canvas",
  },
  {
    mode: "roblox",
    title: "Roblox UI",
    description: "Design in-game HUDs, inventory screens and menus. Export as a ready-to-use Roblox LocalScript.",
    cta: "Start with Roblox HUD",
  },
];

export function ChooseModeModal({
  onSelect,
}: {
  onSelect: (mode: DesignMode) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl p-8">
        <h2 className="text-xl font-bold mb-1 text-slate-100">Choose Design Mode</h2>
        <p className="text-sm text-slate-400 mb-6">Select a mode to get started. You can switch at any time.</p>
        <div className="grid grid-cols-2 gap-4">
          {MODES.map((m) => (
            <button
              key={m.mode}
              className="text-left rounded-xl border border-slate-700/60 bg-slate-800/60 hover:border-[--color-brand] hover:bg-slate-800 transition-colors p-5 focus:outline-none focus:ring-2 focus:ring-[--color-brand]"
              onClick={() => onSelect(m.mode)}
            >
              <div className="font-semibold text-slate-100 mb-1">{m.title}</div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">{m.description}</p>
              <span className="inline-block text-xs px-2 py-1 rounded border border-[--color-brand] text-[--color-brand]">
                {m.cta}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
