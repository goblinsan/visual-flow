/**
 * ChooseModeModal (#142)
 *
 * Welcoming entry screen shown on first load. Lets the user explore features,
 * choose a template category to start with, or jump into a blank canvas.
 *
 * When a category is selected, a second step shows:
 *  - template picker (filtered for the category)
 *  - optional palette preset selector
 *  - optional font pair selector
 */

import { useState, useEffect } from 'react';
import { loadGoogleFont } from '../utils/googleFonts';

export type DesignMode = "general" | "roblox";

/** Simplified template metadata passed from the parent */
export interface TemplateInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
}

export type WelcomeAction =
  | { type: 'blank' }
  | { type: 'explore' }
  | { type: 'template'; category: string; templateId: string; palette?: string[]; fonts?: { heading: string; body: string } };

// ── Preset palettes for quick-start ────────────────────────────────────────
const PRESET_PALETTES: { id: string; name: string; colors: string[] }[] = [
  { id: 'none', name: 'None', colors: [] },
  { id: 'ocean', name: 'Ocean', colors: ['#0f172a', '#1e3a5f', '#3b82f6', '#93c5fd', '#f0f9ff'] },
  { id: 'sunset', name: 'Sunset', colors: ['#7c2d12', '#ea580c', '#fb923c', '#fde68a', '#fffbeb'] },
  { id: 'forest', name: 'Forest', colors: ['#14532d', '#16a34a', '#4ade80', '#bbf7d0', '#f0fdf4'] },
  { id: 'slate', name: 'Slate', colors: ['#0f172a', '#334155', '#64748b', '#cbd5e1', '#f8fafc'] },
  { id: 'berry', name: 'Berry', colors: ['#4a044e', '#a21caf', '#e879f9', '#f5d0fe', '#fdf4ff'] },
];

// ── Font pair presets ──────────────────────────────────────────────────────
const FONT_PAIRS: { id: string; heading: string; body: string; label: string; style: string }[] = [
  { id: 'default', heading: 'Inter', body: 'Inter', label: 'Clean', style: 'Modern sans-serif' },
  { id: 'elegant', heading: 'Playfair Display', body: 'Inter', label: 'Elegant', style: 'Serif + sans' },
  { id: 'modern', heading: 'Space Grotesk', body: 'DM Sans', label: 'Techy', style: 'Geometric sans' },
  { id: 'friendly', heading: 'Poppins', body: 'Open Sans', label: 'Friendly', style: 'Rounded sans' },
];

// ── Category definitions ───────────────────────────────────────────────────
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

// ── Helper: ensure a Google Font is loaded for preview ─────────────────────
const ensureFont = (name: string) => loadGoogleFont(name, [400, 600, 700]);

export function ChooseModeModal({
  onSelect,
  templates = [],
}: {
  onSelect: (action: WelcomeAction) => void;
  templates?: TemplateInfo[];
}) {
  // Two-step flow: null = category picker, string = sub-options for that category
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<string>('none');
  const [selectedFontPair, setSelectedFontPair] = useState<string>('default');

  // When a category is selected, auto-select the first template
  const categoryTemplates = templates.filter(t =>
    t.category === selectedCategory
    || (selectedCategory === 'web' && (t.category === 'ecommerce' || t.category === 'layout'))
  );

  useEffect(() => {
    if (selectedCategory && categoryTemplates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(categoryTemplates[0].id);
    }
  }, [selectedCategory, categoryTemplates, selectedTemplate]);

  // Preload font pair fonts
  useEffect(() => {
    FONT_PAIRS.forEach(fp => {
      ensureFont(fp.heading);
      ensureFont(fp.body);
    });
  }, []);

  const handleStartCategory = (category: string) => {
    // If no templates provided, immediately fire the action (legacy / EditorApp path)
    if (templates.length === 0) {
      const defaultMap: Record<string, string> = { web: 'top-nav', game: 'game-ui-hud', presentation: 'presentation-deck' };
      onSelect({ type: 'template', category, templateId: defaultMap[category] || 'blank' });
      return;
    }
    setSelectedCategory(category);
    setSelectedTemplate(null);
    setSelectedPalette('none');
    setSelectedFontPair('default');
  };

  const handleConfirm = () => {
    if (!selectedCategory || !selectedTemplate) return;
    const palette = PRESET_PALETTES.find(p => p.id === selectedPalette);
    const fontPair = FONT_PAIRS.find(fp => fp.id === selectedFontPair);
    onSelect({
      type: 'template',
      category: selectedCategory,
      templateId: selectedTemplate,
      palette: palette && palette.colors.length > 0 ? palette.colors : undefined,
      fonts: fontPair && fontPair.id !== 'default' ? { heading: fontPair.heading, body: fontPair.body } : undefined,
    });
  };

  const activeFontPair = FONT_PAIRS.find(fp => fp.id === selectedFontPair);

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
          <p className="text-white/60 text-sm">
            {selectedCategory ? 'Choose a template and customise your starting point.' : 'Design, prototype, and collaborate — all in one canvas.'}
          </p>
        </div>

        {/* ─── Step 1: Category picker ─── */}
        {!selectedCategory && (
          <div className="space-y-3">
            {/* Template categories row */}
            <div>
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">Start from a template</p>
              <div className="grid grid-cols-3 gap-3">
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.category}
                    onClick={() => handleStartCategory(cat.category)}
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
        )}

        {/* ─── Step 2: Sub-options for selected category ─── */}
        {selectedCategory && (
          <div className="space-y-4">
            {/* Back button */}
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-2 text-[12px] text-white/50 hover:text-white/80 transition-colors mb-1"
            >
              <i className="fa-solid fa-arrow-left text-[10px]" />
              Back to categories
            </button>

            {/* Template picker */}
            <div>
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">Choose a template</p>
              <div className={`grid gap-2 ${categoryTemplates.length >= 4 ? 'grid-cols-4' : categoryTemplates.length === 3 ? 'grid-cols-3' : categoryTemplates.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {categoryTemplates.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`group text-left rounded-lg border transition-all duration-200 p-3 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 ${
                      selectedTemplate === tmpl.id
                        ? 'bg-white/15 border-cyan-400/70 ring-1 ring-cyan-400/40'
                        : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <i className={`${tmpl.icon} text-[12px] ${selectedTemplate === tmpl.id ? 'text-cyan-300' : 'text-white/40'}`} />
                      <span className={`text-[12px] font-medium ${selectedTemplate === tmpl.id ? 'text-white' : 'text-white/70'}`}>{tmpl.name}</span>
                    </div>
                    <p className="text-[10px] text-white/40 leading-relaxed">{tmpl.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Palette picker */}
            <div>
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">Color Palette</p>
              <div className="flex gap-2 flex-wrap">
                {PRESET_PALETTES.map((pal) => (
                  <button
                    key={pal.id}
                    onClick={() => setSelectedPalette(pal.id)}
                    className={`rounded-lg border transition-all duration-200 p-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 min-w-[80px] ${
                      selectedPalette === pal.id
                        ? 'bg-white/15 border-cyan-400/70 ring-1 ring-cyan-400/40'
                        : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/20'
                    }`}
                    title={pal.name}
                  >
                    {pal.colors.length > 0 ? (
                      <div className="flex h-5 rounded overflow-hidden mb-1.5">
                        {pal.colors.map((c, i) => (
                          <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-5 rounded overflow-hidden mb-1.5 border border-dashed border-white/20 items-center justify-center">
                        <i className="fa-solid fa-ban text-[8px] text-white/25" />
                      </div>
                    )}
                    <div className={`text-[10px] text-center ${selectedPalette === pal.id ? 'text-white/80' : 'text-white/40'}`}>{pal.name}</div>
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-white/30 mt-1.5 px-1 italic">Browse more palettes in the Theme panel after starting.</p>
            </div>

            {/* Font pair picker */}
            <div>
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">Font Pairing</p>
              <div className="grid grid-cols-4 gap-2">
                {FONT_PAIRS.map((fp) => (
                  <button
                    key={fp.id}
                    onClick={() => setSelectedFontPair(fp.id)}
                    className={`rounded-lg border transition-all duration-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 text-left ${
                      selectedFontPair === fp.id
                        ? 'bg-white/15 border-cyan-400/70 ring-1 ring-cyan-400/40'
                        : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    <div className="text-[13px] font-semibold text-white/80 mb-0.5 truncate" style={{ fontFamily: fp.heading }}>{fp.label}</div>
                    <div className="text-[10px] text-white/35 truncate" style={{ fontFamily: fp.body }}>{fp.style}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview bar + Start button */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3 text-[10px] text-white/40">
                {selectedTemplate && (
                  <span className="flex items-center gap-1.5">
                    <i className={`${categoryTemplates.find(t => t.id === selectedTemplate)?.icon} text-[9px]`} />
                    {categoryTemplates.find(t => t.id === selectedTemplate)?.name}
                  </span>
                )}
                {selectedPalette !== 'none' && (
                  <>
                    <span className="text-white/15">|</span>
                    <span className="flex items-center gap-1">
                      <span className="flex h-3 rounded-sm overflow-hidden">
                        {PRESET_PALETTES.find(p => p.id === selectedPalette)?.colors.map((c, i) => (
                          <span key={i} className="w-3 h-full" style={{ backgroundColor: c }} />
                        ))}
                      </span>
                      {PRESET_PALETTES.find(p => p.id === selectedPalette)?.name}
                    </span>
                  </>
                )}
                {activeFontPair && (
                  <>
                    <span className="text-white/15">|</span>
                    <span style={{ fontFamily: activeFontPair.heading }}>{activeFontPair.label}</span>
                  </>
                )}
              </div>
              <button
                onClick={handleConfirm}
                disabled={!selectedTemplate}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold shadow-lg hover:shadow-xl hover:from-cyan-400 hover:to-blue-400 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              >
                Start Designing
                <i className="fa-solid fa-arrow-right ml-2 text-[11px]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
