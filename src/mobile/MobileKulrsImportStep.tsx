import { useMemo, useState } from 'react';
import type { StyleMood } from '../style-flow/types';

interface KulrsImportPayload {
  colors: string[];
  headingFont: string;
  bodyFont: string;
  mood: StyleMood;
}

function inferMoodFromPalette(colors: string[]): StyleMood {
  const first = colors[0]?.toLowerCase() ?? '#1a1a2e';
  if (first.includes('ff') || first.includes('f7')) return 'bold';
  if (first.includes('6c63') || first.includes('43bc')) return 'playful';
  if (first.includes('2d2d') || first.includes('8b73')) return 'elegant';
  if (first.includes('0a0e') || first.includes('1b28')) return 'technical';
  return 'minimal';
}

function parseKulrsLink(input: string): KulrsImportPayload | null {
  try {
    const url = input.startsWith('http')
      ? new URL(input)
      : new URL(input, window.location.origin);
    const sp = url.searchParams;
    const raw = (sp.get('colors') || '')
      .split(',')
      .map((c) => (c.startsWith('#') ? c : `#${c}`))
      .filter((c) => /^#[0-9a-fA-F]{6}$/.test(c));
    if (!raw.length) return null;

    return {
      colors: raw.slice(0, 5),
      headingFont: sp.get('headingFont') || 'Inter',
      bodyFont: sp.get('bodyFont') || 'Inter',
      mood: inferMoodFromPalette(raw),
    };
  } catch {
    return null;
  }
}

export interface MobileKulrsImportStepProps {
  onBack: () => void;
  onImport: (payload: KulrsImportPayload) => void;
}

export function MobileKulrsImportStep({ onBack, onImport }: MobileKulrsImportStepProps) {
  const [link, setLink] = useState<string>(() => window.location.href);

  const parsed = useMemo(() => parseKulrsLink(link), [link]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white px-5 pt-6 pb-8">
      <div className="flex items-center gap-3 mb-8">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.06] border border-white/10 text-white/60"
        >
          <i className="fa-solid fa-chevron-left text-sm" />
        </button>
        <div>
          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
            Step 1 of 4
          </p>
          <h2 className="text-lg font-bold leading-tight">Import from Kulrs</h2>
        </div>
      </div>

      <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">
        Paste Kulrs URL
      </p>
      <textarea
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="https://vizail.com/from-kulrs?colors=..."
        className="w-full h-28 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 text-sm text-white/85 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
      />

      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <p className="text-xs text-white/55 mb-2">Parsed palette</p>
        {parsed ? (
          <>
            <div className="flex gap-1.5 mb-2">
              {parsed.colors.map((hex) => (
                <span key={hex} className="h-7 flex-1 rounded-md border border-white/10" style={{ backgroundColor: hex }} />
              ))}
            </div>
            <p className="text-xs text-white/65">{parsed.headingFont} / {parsed.bodyFont}</p>
          </>
        ) : (
          <p className="text-xs text-rose-300">No valid Kulrs palette found in this link.</p>
        )}
      </div>

      <button
        type="button"
        disabled={!parsed}
        onClick={() => {
          if (parsed) onImport(parsed);
        }}
        className="mt-auto w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-blue-500 text-white active:scale-[0.98]"
      >
        Use this Kulrs palette
      </button>
    </div>
  );
}
