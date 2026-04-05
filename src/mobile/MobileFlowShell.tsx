/**
 * MobileFlowShell
 *
 * Top-level orchestrator for the mobile-first, selection-based design flow.
 * Replaces the unusable canvas-based editor on mobile with a streamlined
 * guided experience:
 *
 *   1. Entry      – user picks how to start (theme / color / font / image / template / blank)
 *   2. Pick       – entry-specific selection screen
 *   3. Refine     – mood chips + industry picker (pre-filled from pick step)
 *   4. Components – button / card / navigation style selectors  #214
 *   5. Preview    – phone-frame mock-up + summary review  #215
 *   6. Done       – success + token export
 *
 * Issues:
 *  #205 – Audit current desktop canvas actions
 *  #206 – Design the simplified selection-based workflow
 *  #207 – Specify mobile information architecture and navigation
 *  #213 – Template and preset selection screens
 *  #214 – Component selection and configuration steps
 *  #215 – Lightweight live preview and summary review
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { StyleMood, StyleIndustry } from '../style-flow/types';
import type { MobileEntryPoint, MobileFlowStep, MobileDesignSnapshot, MobileComponentSelections } from './types';
import { MobileEntryScreen } from './MobileEntryScreen';
import { MobileColorPickStep } from './MobileColorPickStep';
import { MobileRefineStep } from './MobileRefineStep';
import { MobileComponentStep } from './MobileComponentStep';
import { MobilePreviewScreen } from './MobilePreviewScreen';
import { MobileTemplatePickStep } from './MobileTemplatePickStep';
import { MobileKulrsImportStep } from './MobileKulrsImportStep';
import { buildSnapshot } from './snapshotBuilder';
import { ThemeFirstFlow, type ThemeEntry } from '../components/ThemeFirstFlow';
import { FontFirstFlow } from '../components/FontFirstFlow';
import { ImageFirstFlow } from '../components/ImageFirstFlow';
import { saveMobileFlowSession, loadMobileFlowSession, clearMobileFlowSession } from '../utils/persistence';
import { darken, lighten } from '../utils/color';
import {
  trackFlowStarted,
  trackStepViewed,
  trackStepCompleted,
  trackFlowCompleted,
  trackSessionResumed,
  trackEntrySelected,
  trackTemplateSelected,
  trackComponentsSelected,
  trackTokensDownloaded,
} from './telemetry';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface MobileFlowShellProps {
  /**
   * Called when the user confirms their design at the end of the flow.
   * Receives the assembled MobileDesignSnapshot (tokens, colors, fonts).
   */
  onComplete: (snapshot: MobileDesignSnapshot) => void;
}

// ── Transient pick-step state ─────────────────────────────────────────────────

interface PickState {
  colors: string[];
  moods: StyleMood[];
  font: { family: string; body: string } | null;
  /** Pre-seeded industry from a template preset (#213). */
  industry: StyleIndustry | null;
}

function alignPaletteToMainColor(baseColors: string[], mainColor: string): string[] {
  const base = baseColors.length ? [...baseColors] : [mainColor, lighten(mainColor, 0.2), lighten(mainColor, 0.86), darken(mainColor, 0.2)];
  return [
    mainColor,
    base[1] ?? lighten(mainColor, 0.18),
    base[2] ?? lighten(mainColor, 0.86),
    base[3] ?? darken(mainColor, 0.2),
  ];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MobileFlowShell({ onComplete }: MobileFlowShellProps) {
  // Stable session identifier for analytics — generated once per mount (#223)
  const sessionId = useRef<string>(
    `mf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  );

  // Track step-entry timestamps so we can report duration per step (#223)
  const stepEnteredAt = useRef<number>(Date.now());

  // Track total flow start time for overall journey duration (#223)
  const flowStartedAt = useRef<number>(Date.now());

  // Restore any previously saved session on mount — lazy initialisers so
  // localStorage is only read once (Issue #217)
  const [step, setStep]           = useState<MobileFlowStep>(() => {
    const s = loadMobileFlowSession();
    return s?.step ?? 'entry';
  });
  const [entry, setEntry]         = useState<MobileEntryPoint | null>(() => {
    return loadMobileFlowSession()?.entry ?? null;
  });
  const [pickState, setPickState] = useState<PickState>(() => {
    const s = loadMobileFlowSession();
    return {
      colors:   s?.pickState.colors   ?? [],
      moods:    (s?.pickState.moods   ?? []) as StyleMood[],
      font:     s?.pickState.font     ?? null,
      industry: (s?.pickState.industry ?? null) as StyleIndustry | null,
    };
  });
  const [snapshot, setSnapshot]   = useState<MobileDesignSnapshot | null>(() => {
    return loadMobileFlowSession()?.snapshot ?? null;
  });
  const [themeMainColor, setThemeMainColor] = useState<string>('#ec4899');
  const [selectedThemeEntry, setSelectedThemeEntry] = useState<ThemeEntry | null>(null);

  // Fire session-resumed event if we loaded a non-entry step (#223)
  useEffect(() => {
    if (step !== 'entry') {
      trackSessionResumed(sessionId.current, step);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track step views (#223) — fires whenever the active step changes
  useEffect(() => {
    trackStepViewed(sessionId.current, step);
    stepEnteredAt.current = Date.now();
  }, [step]);

  // Persist session on every state change (Issue #217)
  useEffect(() => {
    if (step === 'entry') {
      // Nothing yet to save; clear any stale session
      clearMobileFlowSession();
      return;
    }
    saveMobileFlowSession({
      step,
      entry,
      pickState: {
        colors:   pickState.colors,
        moods:    pickState.moods,
        font:     pickState.font,
        industry: pickState.industry,
      },
      snapshot,
      savedAt: Date.now(),
    });
  }, [step, entry, pickState, snapshot]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  /** User selected an entry point on the landing screen. */
  const handleEntrySelect = useCallback((ep: MobileEntryPoint) => {
    // Fire flow-started on the first user action, then track the specific entry (#223)
    trackFlowStarted(sessionId.current);
    trackEntrySelected(sessionId.current, ep);
    trackStepCompleted(sessionId.current, 'entry', Date.now() - stepEnteredAt.current);
    setEntry(ep);
    // 'blank' skips the pick step and goes straight to refinement
    setStep(ep === 'blank' ? 'refine' : 'pick');
  }, []);

  /** User confirmed their choice on the pick step. */
  const handlePickDone = useCallback((colors: string[], moods: StyleMood[], font: { family: string; body: string } | null, industry?: StyleIndustry) => {
    trackStepCompleted(sessionId.current, 'pick', Date.now() - stepEnteredAt.current);
    setPickState({ colors, moods, font, industry: industry ?? null });
    setStep('refine');
  }, []);

  /** User confirmed mood + industry on the refine step. */
  const handleRefineDone = useCallback((moods: StyleMood[], industry: StyleIndustry) => {
    trackStepCompleted(sessionId.current, 'refine', Date.now() - stepEnteredAt.current);
    setPickState((prev) => ({ ...prev, moods, industry }));
    setStep('components');
  }, []);

  /** User confirmed component style selections (#214). */
  const handleComponentsDone = useCallback((selections: MobileComponentSelections) => {
    trackComponentsSelected(
      sessionId.current,
      selections.buttonStyle,
      selections.cardStyle,
      selections.navStyle,
    );
    trackStepCompleted(sessionId.current, 'components', Date.now() - stepEnteredAt.current);
    const snap = buildSnapshot(
      pickState.moods.length ? pickState.moods : ['minimal'],
      (pickState.industry ?? 'technology') as StyleIndustry,
      pickState.colors.length ? pickState.colors : undefined,
      pickState.font ?? undefined,
      selections,
    );
    setSnapshot(snap);
    setStep('preview');
  }, [pickState]);

  /** User confirmed the preview — call the parent with the snapshot. */
  const handlePreviewConfirm = useCallback(() => {
    if (snapshot) {
      trackFlowCompleted(sessionId.current, snapshot, Date.now() - flowStartedAt.current);
      onComplete(snapshot);
    }
    clearMobileFlowSession();
    setStep('done');
  }, [snapshot, onComplete]);

  /** Reset the entire flow. */
  const handleRestart = useCallback(() => {
    clearMobileFlowSession();
    setStep('entry');
    setEntry(null);
    setPickState({ colors: [], moods: [], font: null, industry: null });
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
              Step 1 of 4
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
      case 'template':
        return (
          <MobileTemplatePickStep
            onPick={(preset) => {
              trackTemplateSelected(sessionId.current, preset.id);
              handlePickDone(
                [...preset.colors],
                [preset.mood],
                { family: preset.headingFont, body: preset.bodyFont },
                preset.industry,
              );
            }}
            onBack={() => setStep('entry')}
          />
        );

      case 'theme':
        return (
          <PickWrapper stepLabel="Choose a theme">
            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Recolor selected theme
              </p>
              <div className="flex items-center gap-2 mb-2">
                {['#ec4899', '#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444'].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setThemeMainColor(hex)}
                    aria-label={`Use ${hex} as main color`}
                    className={`w-7 h-7 rounded-md border ${themeMainColor === hex ? 'border-slate-900' : 'border-slate-300'}`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
              <label className="text-xs text-slate-600 flex items-center gap-2">
                Main color
                <input
                  type="color"
                  value={themeMainColor}
                  onChange={(e) => setThemeMainColor(e.target.value)}
                  className="w-9 h-7 rounded border border-slate-300"
                />
              </label>
              {selectedThemeEntry && (
                <p className="mt-2 text-[11px] text-slate-500">
                  Applying <span className="font-semibold text-slate-700">{selectedThemeEntry.name}</span> with main color <span className="font-mono">{themeMainColor}</span>
                </p>
              )}
            </div>
            <ThemeFirstFlow
              onSelectTheme={setSelectedThemeEntry}
              onApplyTheme={(seed) =>
                handlePickDone(
                  alignPaletteToMainColor(seed.baseColors ?? [], themeMainColor),
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

      case 'kulrs':
        return (
          <MobileKulrsImportStep
            onBack={() => setStep('entry')}
            onImport={(payload) =>
              handlePickDone(
                payload.colors,
                [payload.mood],
                { family: payload.headingFont, body: payload.bodyFont },
              )
            }
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
            trackTokensDownloaded(sessionId.current);
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
        initialIndustry={pickState.industry ?? 'technology'}
        onConfirm={handleRefineDone}
        onBack={() => setStep(entry === 'blank' ? 'entry' : 'pick')}
      />
    );
  }

  if (step === 'components') {
    return (
      <MobileComponentStep
        onConfirm={handleComponentsDone}
        onBack={() => setStep('refine')}
      />
    );
  }

  if (step === 'preview' && snapshot) {
    return (
      <MobilePreviewScreen
        snapshot={snapshot}
        onBack={() => setStep('components')}
        onConfirm={handlePreviewConfirm}
      />
    );
  }

  // Fallback
  return <MobileEntryScreen onSelect={handleEntrySelect} />;
}
