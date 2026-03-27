/**
 * MobileFlowShell
 *
 * Top-level orchestrator for the mobile-first, selection-based design flow.
 * Replaces the unusable canvas-based editor on mobile with a streamlined
 * 5-step guided experience:
 *
 *   1. Entry  – user picks how to start (theme / colour / font / image / blank)
 *   2. Pick   – entry-specific selection screen
 *   3. Refine – mood chips + industry picker (pre-filled from pick step)
 *   4. Preview – phone-frame mock-up of the assembled design
 *   5. Done   – success + token export
 *
 * Issues:
 *  #205 – Audit current desktop canvas actions
 *  #206 – Design the simplified selection-based workflow
 *  #207 – Specify mobile information architecture and navigation
 */

import { useState, useCallback } from 'react';
import type { StyleMood, StyleIndustry } from '../style-flow/types';
import type { MobileEntryPoint, MobileFlowStep, MobileDesignSnapshot } from './types';
import { MobileEntryScreen } from './MobileEntryScreen';
import { MobileColorPickStep } from './MobileColorPickStep';
import { MobileRefineStep } from './MobileRefineStep';
import { MobilePreviewScreen } from './MobilePreviewScreen';
import { buildSnapshot } from './snapshotBuilder';
import { ThemeFirstFlow } from '../components/ThemeFirstFlow';
import { FontFirstFlow } from '../components/FontFirstFlow';
import { ImageFirstFlow } from '../components/ImageFirstFlow';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface MobileFlowShellProps {
  /**
   * Called when the user confirms their design at the end of the flow.
   * Receives the assembled MobileDesignSnapshot (tokens, colours, fonts).
   */
  onComplete: (snapshot: MobileDesignSnapshot) => void;
}

// ── Transient pick-step state ─────────────────────────────────────────────────

interface PickState {
  colors: string[];
  moods: StyleMood[];
  font: { family: string; body: string } | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MobileFlowShell({ onComplete }: MobileFlowShellProps) {
  const [step, setStep]           = useState<MobileFlowStep>('entry');
  const [entry, setEntry]         = useState<MobileEntryPoint | null>(null);
  const [pickState, setPickState] = useState<PickState>({ colors: [], moods: [], font: null });
  const [snapshot, setSnapshot]   = useState<MobileDesignSnapshot | null>(null);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  /** User selected an entry point on the landing screen. */
  const handleEntrySelect = useCallback((ep: MobileEntryPoint) => {
    setEntry(ep);
    // 'blank' skips the pick step and goes straight to refinement
    setStep(ep === 'blank' ? 'refine' : 'pick');
  }, []);

  /** User confirmed their choice on the pick step. */
  const handlePickDone = useCallback((colors: string[], moods: StyleMood[], font: { family: string; body: string } | null) => {
    setPickState({ colors, moods, font });
    setStep('refine');
  }, []);

  /** User confirmed mood + industry on the refine step. */
  const handleRefineDone = useCallback((moods: StyleMood[], industry: StyleIndustry) => {
    const snap = buildSnapshot(
      moods,
      industry,
      pickState.colors.length ? pickState.colors : undefined,
      pickState.font ?? undefined,
    );
    setSnapshot(snap);
    setStep('preview');
  }, [pickState]);

  /** User confirmed the preview — call the parent with the snapshot. */
  const handlePreviewConfirm = useCallback(() => {
    if (snapshot) {
      onComplete(snapshot);
    }
    setStep('done');
  }, [snapshot, onComplete]);

  /** Reset the entire flow. */
  const handleRestart = useCallback(() => {
    setStep('entry');
    setEntry(null);
    setPickState({ colors: [], moods: [], font: null });
    setSnapshot(null);
  }, []);

  // ── Pick step renderers ───────────────────────────────────────────────────────

  /**
   * Wraps an entry-specific flow component with a standard back-button header
   * so the user can always navigate back to the entry screen.
   */
  function PickWrapper({ children, stepLabel }: { children: React.ReactNode; stepLabel: string }) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-white">
        {/* Back nav */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-4 shrink-0">
          <button
            type="button"
            onClick={() => setStep('entry')}
            aria-label="Go back"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.06] border border-white/10 text-white/60"
          >
            <i className="fa-solid fa-chevron-left text-sm" />
          </button>
          <div>
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
              Step 1 of 3
            </p>
            <h2 className="text-lg font-bold leading-tight">{stepLabel}</h2>
          </div>
        </div>
        {/* Flow content in a scrollable light card */}
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          <div className="rounded-2xl bg-white p-4">
            {children}
          </div>
        </div>
      </div>
    );
  }

  function renderPickStep() {
    switch (entry) {
      case 'theme':
        return (
          <PickWrapper stepLabel="Choose a theme">
            <ThemeFirstFlow
              onApplyTheme={(seed) =>
                handlePickDone(
                  seed.baseColors ?? [],
                  seed.moods as StyleMood[],
                  seed.fontPreferences?.length
                    ? { family: seed.fontPreferences[0]!, body: seed.fontPreferences[1] ?? seed.fontPreferences[0]! }
                    : null,
                )
              }
            />
          </PickWrapper>
        );

      case 'font':
        return (
          <PickWrapper stepLabel="Choose a font">
            <FontFirstFlow
              onApplyFont={(family, body, moods, colors) =>
                handlePickDone(colors, moods as StyleMood[], { family, body })
              }
            />
          </PickWrapper>
        );

      case 'image':
        return (
          <PickWrapper stepLabel="Upload an image">
            <ImageFirstFlow
              onExtractedColors={(colors, moods) =>
                handlePickDone(colors, moods as StyleMood[], null)
              }
            />
          </PickWrapper>
        );

      case 'color':
        return (
          <MobileColorPickStep
            onPick={(colors, mood) => handlePickDone(colors, [mood], null)}
            onBack={() => setStep('entry')}
          />
        );

      default:
        return null;
    }
  }

  // ── Step: done ───────────────────────────────────────────────────────────────

  if (step === 'done' && snapshot) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-white items-center justify-center px-5 py-12">
        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-cyan-400/15 flex items-center justify-center mb-6">
          <i className="fa-solid fa-check text-cyan-400 text-3xl" />
        </div>

        <h2 className="text-2xl font-bold mb-2">Design ready!</h2>
        <p className="text-white/50 text-sm text-center mb-8 max-w-xs">
          Your design tokens have been assembled. Download the CSS below or start over.
        </p>

        {/* Token preview */}
        <div className="w-full max-w-sm bg-white/[0.05] border border-white/10 rounded-2xl p-4 mb-6 font-mono text-xs text-white/70 overflow-x-auto">
          <pre>{`:root {\n${Object.entries(snapshot.tokens)
            .map(([k, v]) => `  --${k}: ${v};`)
            .join('\n')}\n}`}</pre>
        </div>

        {/* Actions */}
        <button
          type="button"
          onClick={() => {
            const css = `:root {\n${Object.entries(snapshot.tokens)
              .map(([k, v]) => `  --${k}: ${v};`)
              .join('\n')}\n}`;
            const blob = new Blob([css], { type: 'text/css' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = 'design-tokens.css';
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="w-full max-w-sm py-4 rounded-2xl font-semibold text-base
                     bg-gradient-to-r from-cyan-500 to-blue-500 text-white mb-3
                     active:scale-[0.98] transition-transform duration-100"
        >
          <i className="fa-solid fa-download mr-2" />
          Download CSS tokens
        </button>

        <button
          type="button"
          onClick={handleRestart}
          className="w-full max-w-sm py-3 rounded-2xl font-semibold text-sm
                     border border-white/15 text-white/60
                     active:scale-[0.98] transition-transform duration-100"
        >
          Start over
        </button>
      </div>
    );
  }

  // ── Step routing ──────────────────────────────────────────────────────────────

  if (step === 'entry') {
    return <MobileEntryScreen onSelect={handleEntrySelect} />;
  }

  if (step === 'pick') {
    return renderPickStep();
  }

  if (step === 'refine') {
    return (
      <MobileRefineStep
        initialMoods={pickState.moods}
        initialIndustry="technology"
        onConfirm={handleRefineDone}
        onBack={() => setStep(entry === 'blank' ? 'entry' : 'pick')}
      />
    );
  }

  if (step === 'preview' && snapshot) {
    return (
      <MobilePreviewScreen
        snapshot={snapshot}
        onBack={() => setStep('refine')}
        onConfirm={handlePreviewConfirm}
      />
    );
  }

  // Fallback
  return <MobileEntryScreen onSelect={handleEntrySelect} />;
}
