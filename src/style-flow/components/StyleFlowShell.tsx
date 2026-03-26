/**
 * StyleFlowShell
 * Phase 1 (#176): Multi-step UI shell with progress indicator, step cards,
 * and preview scaffold.
 * Phase 3 (#184, #185, #186): Typography, button, and navigation style selection.
 *
 * This component is a controlled shell: callers pass in a StyleFlowStateMachine
 * instance and receive `onClose` when the journey ends or is dismissed.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { StyleMood, StyleIndustry, StyleRecommendation } from '../types';
import { StyleFlowStateMachine, JOURNEY_STEPS } from '../journey';
import { defaultStyleFlowStorage } from '../persistence';
import {
  trackJourneyStarted,
  trackJourneyCompleted,
  trackJourneyAbandoned,
  trackStepViewed,
  trackStepCompleted,
  trackStepAbandoned,
  trackRecommendationSelected,
  trackExportTriggered,
} from '../telemetry';
import { StepProgress } from './StepProgress';
import { StyleCard } from './StyleCard';
import { PreviewScaffold } from './PreviewScaffold';
import { TypographyPanel, TYPOGRAPHY_PAIRINGS } from './TypographyPanel';
import { ButtonStylePanel, BUTTON_STYLES } from './ButtonStylePanel';
import { NavigationStylePanel, NAVIGATION_STYLES } from './NavigationStylePanel';
import { ConceptComparisonPanel } from './ConceptComparisonPanel';
import { generateConcepts } from '../conceptGenerator';

// ── Mood & industry options ───────────────────────────────────────────────────

const MOOD_OPTIONS: { value: StyleMood; label: string; icon: string }[] = [
  { value: 'minimal', label: 'Minimal', icon: 'fa-solid fa-minus' },
  { value: 'bold', label: 'Bold', icon: 'fa-solid fa-bolt' },
  { value: 'playful', label: 'Playful', icon: 'fa-solid fa-face-smile' },
  { value: 'elegant', label: 'Elegant', icon: 'fa-solid fa-gem' },
  { value: 'technical', label: 'Technical', icon: 'fa-solid fa-microchip' },
];

const INDUSTRY_OPTIONS: { value: StyleIndustry; label: string }[] = [
  { value: 'technology', label: 'Technology' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'finance', label: 'Finance' },
  { value: 'health', label: 'Health' },
  { value: 'education', label: 'Education' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'food', label: 'Food & Beverage' },
  { value: 'other', label: 'Other' },
];

// ── Token helpers ─────────────────────────────────────────────────────────────

/**
 * Upsert a design token by name in the given mutable array.
 * Updates the value in-place if the token already exists, otherwise appends it.
 */
function upsertToken(
  tokens: Array<{ name: string; value: string; description?: string }>,
  name: string,
  value: string,
): void {
  const existing = tokens.find((t) => t.name === name);
  if (existing) existing.value = value;
  else tokens.push({ name, value });
}

// ── Stub recommendation generator ────────────────────────────────────────────
// Production: replace with an API call to the recommendation engine.

function generateRecommendations(
  moods: StyleMood[],
  industry: StyleIndustry,
): StyleRecommendation[] {
  const moodStr = moods[0] ?? 'minimal';
  const palettes: Record<StyleMood, [string, string, string, string]> = {
    minimal: ['#1A1A2E', '#16213E', '#0F3460', '#E94560'],
    bold: ['#FF6B35', '#F7931E', '#FFD23F', '#EE4266'],
    playful: ['#6C63FF', '#FF6584', '#43BCCD', '#F9C74F'],
    elegant: ['#2D2D2D', '#B8A472', '#E8E0D4', '#8B7355'],
    technical: ['#0A0E17', '#1B2838', '#66C0F4', '#4C7899'],
  };
  const [c1, c2, c3, c4] = palettes[moodStr];

  const base: Omit<StyleRecommendation, 'id' | 'name' | 'description' | 'confidence'> = {
    swatches: [
      { role: 'primary', hex: c1 },
      { role: 'secondary', hex: c2 },
      { role: 'accent', hex: c3 },
      { role: 'surface', hex: '#ffffff' },
      { role: 'text', hex: '#111111' },
    ],
    typography: {
      headingFont: moodStr === 'elegant' ? 'Playfair Display' : 'Inter',
      bodyFont: 'Inter',
      baseSizePx: 16,
      lineHeight: 1.6,
    },
    tokens: [
      { name: 'color-primary', value: c1, description: 'Primary brand colour' },
      { name: 'color-secondary', value: c2 },
      { name: 'color-accent', value: c3 },
      { name: 'color-highlight', value: c4 },
      { name: 'font-heading', value: moodStr === 'elegant' ? 'Playfair Display' : 'Inter' },
      { name: 'font-body', value: 'Inter' },
      { name: 'font-size-base', value: '16px' },
      { name: 'line-height-base', value: '1.6' },
    ],
  };

  const industryLabel = industry.charAt(0).toUpperCase() + industry.slice(1);
  return [
    {
      id: `rec-${moodStr}-1`,
      name: `${moodStr.charAt(0).toUpperCase() + moodStr.slice(1)} ${industryLabel}`,
      description: `A ${moodStr} palette tuned for the ${industry} sector.`,
      confidence: 0.92,
      ...base,
    },
    {
      id: `rec-${moodStr}-2`,
      name: `${moodStr.charAt(0).toUpperCase() + moodStr.slice(1)} Light`,
      description: `A lighter, airier take on the ${moodStr} mood.`,
      confidence: 0.78,
      ...base,
      swatches: [
        { role: 'primary', hex: c3 },
        { role: 'secondary', hex: c4 },
        { role: 'accent', hex: c1 },
        { role: 'surface', hex: '#F5F5F5' },
        { role: 'text', hex: '#222222' },
      ],
    },
    {
      id: `rec-${moodStr}-3`,
      name: `Dark ${moodStr.charAt(0).toUpperCase() + moodStr.slice(1)}`,
      description: `Deep, immersive tones for a ${moodStr} dark-mode experience.`,
      confidence: 0.65,
      ...base,
      swatches: [
        { role: 'primary', hex: c2 },
        { role: 'secondary', hex: c1 },
        { role: 'accent', hex: c4 },
        { role: 'surface', hex: '#121212' },
        { role: 'text', hex: '#E0E0E0' },
      ],
    },
  ];
}

// ── Serialise tokens to CSS variables ────────────────────────────────────────

function tokensToCSS(tokens: StyleRecommendation['tokens']): string {
  const lines = tokens.map((t) => `  --${t.name}: ${t.value};`);
  return `:root {\n${lines.join('\n')}\n}`;
}

function tokensToJSON(tokens: StyleRecommendation['tokens']): string {
  const obj: Record<string, string> = {};
  tokens.forEach((t) => { obj[t.name] = t.value; });
  return JSON.stringify(obj, null, 2);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface StyleFlowShellProps {
  /** A pre-configured machine instance (create once, pass via useMemo) */
  machine: StyleFlowStateMachine;
  /** Called when the shell should close (journey complete or dismissed) */
  onClose: () => void;
}

export function StyleFlowShell({ machine, onClose }: StyleFlowShellProps) {
  const [state, setState] = useState(() => machine.getState());
  const stepStartRef = useRef<number>(Date.now());
  const journeyStartRef = useRef<number>(Date.now());

  // ── Subscribe to machine updates ────────────────────────────────────────────
  useEffect(() => {
    const unsub = machine.subscribe((s) => setState({ ...s }));
    return unsub;
  }, [machine]);

  // ── Start the journey on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (state.status === 'idle') {
      machine.start();
      trackJourneyStarted(state.id);
      journeyStartRef.current = Date.now();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Track step views ────────────────────────────────────────────────────────
  useEffect(() => {
    trackStepViewed(state.id, state.currentStepId);
    stepStartRef.current = Date.now();
  }, [state.id, state.currentStepId]);

  // ── Persist on every state change ───────────────────────────────────────────
  useEffect(() => {
    defaultStyleFlowStorage.save(state).catch(() => {/* non-critical */});
  }, [state]);

  // ── Seed step state ─────────────────────────────────────────────────────────
  const [selectedMoods, setSelectedMoods] = useState<StyleMood[]>(
    state.seeds?.moods ?? [],
  );
  const [selectedIndustry, setSelectedIndustry] = useState<StyleIndustry>(
    state.seeds?.industry ?? 'technology',
  );
  const [notes, setNotes] = useState<string>(state.seeds?.notes ?? '');

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAdvance = useCallback(() => {
    const elapsed = Date.now() - stepStartRef.current;

    if (state.currentStepId === 'seeds') {
      machine.updateSeeds({ moods: selectedMoods, industry: selectedIndustry, notes: notes || undefined });
      // Generate legacy recommendations (used by individual step previews)
      const recs = generateRecommendations(selectedMoods, selectedIndustry);
      machine.setRecommendations(recs);
      // Generate Phase 4 full-concept variations
      const concepts = generateConcepts(selectedMoods, selectedIndustry, { count: 3 });
      machine.setConcepts(concepts);
    }

    const ok = machine.advance();
    if (!ok) return;

    trackStepCompleted(state.id, state.currentStepId, elapsed);

    if (machine.getState().status === 'completed') {
      trackJourneyCompleted(state.id, Date.now() - journeyStartRef.current);
      // Clean up persisted state once completed
      defaultStyleFlowStorage.remove(state.id).catch(() => {});
    }
  }, [machine, state, selectedMoods, selectedIndustry, notes]);

  const handleRetreat = useCallback(() => {
    machine.retreat();
  }, [machine]);

  const handleDismiss = useCallback(() => {
    const currentState = machine.getState();
    if (currentState.status !== 'completed') {
      trackStepAbandoned(currentState.id, currentState.currentStepId);
      trackJourneyAbandoned(currentState.id, currentState.currentStepId, currentState.status);
      machine.abandon();
    }
    onClose();
  }, [machine, onClose]);

  const handleSelectRecommendation = useCallback(
    (recId: string) => {
      machine.selectRecommendation(recId);
      trackRecommendationSelected(state.id, recId);
    },
    [machine, state.id],
  );

  // ── Phase 4 handlers ────────────────────────────────────────────────────────

  const handleChooseConcept = useCallback(
    (concept: import('../types').StyleConcept) => {
      machine.chooseConcept(concept);
      trackRecommendationSelected(state.id, concept.recommendation.id);
    },
    [machine, state.id],
  );

  const handleReviewConcept = useCallback(
    (conceptId: string, status: import('../types').ConceptReviewStatus) => {
      machine.reviewConcept(conceptId, status);
    },
    [machine],
  );

  const handleToggleLock = useCallback(
    (aspect: import('../types').LockableAspect) => {
      machine.toggleLockedAspect(aspect);
    },
    [machine],
  );

  const handleRegenerateConcepts = useCallback(() => {
    if (!state.seeds) return;
    const lockedValues: Parameters<typeof generateConcepts>[2]['lockedValues'] = {};
    if (state.selection.lockedAspects.includes('recommendation') && state.selection.recommendationId) {
      const rec = state.recommendations.find((r) => r.id === state.selection.recommendationId);
      if (rec) lockedValues.recommendation = rec;
    }
    if (state.selection.lockedAspects.includes('typography') && state.selection.typographyPairingId) {
      lockedValues.typography = state.selection.typographyPairingId;
    }
    if (state.selection.lockedAspects.includes('buttons') && state.selection.buttonStyleId) {
      lockedValues.buttons = state.selection.buttonStyleId;
    }
    if (state.selection.lockedAspects.includes('navigation') && state.selection.navigationStyleId) {
      lockedValues.navigation = state.selection.navigationStyleId;
    }
    const concepts = generateConcepts(state.seeds.moods, state.seeds.industry, {
      count: 3,
      lockedAspects: state.selection.lockedAspects,
      lockedValues,
    });
    machine.setConcepts(concepts);
  }, [machine, state]);

  const handleSelectTypographyPairing = useCallback(
    (pairingId: string) => {
      machine.selectTypographyPairing(pairingId);
    },
    [machine],
  );

  const handleSelectButtonStyle = useCallback(
    (styleId: string) => {
      machine.selectButtonStyle(styleId);
    },
    [machine],
  );

  const handleSelectNavigationStyle = useCallback(
    (styleId: string) => {
      machine.selectNavigationStyle(styleId);
    },
    [machine],
  );

  const handleExport = useCallback(
    (format: 'css-variables' | 'json') => {
      const selected = state.recommendations.find(
        (r) => r.id === state.selection.recommendationId,
      );
      if (!selected) return;

      // Base tokens from recommendation (with any manual overrides applied)
      const tokens = selected.tokens.map((t) => ({
        ...t,
        value: state.selection.tokenOverrides[t.name] ?? t.value,
      }));

      // Merge Phase 3 typography pairing tokens
      const typoPairing = TYPOGRAPHY_PAIRINGS.find(
        (p) => p.id === state.selection.typographyPairingId,
      );
      if (typoPairing) {
        upsertToken(tokens, 'font-heading', typoPairing.headingFont);
        upsertToken(tokens, 'font-body', typoPairing.bodyFont);
      }

      // Merge Phase 3 button style tokens
      const btnStyle = BUTTON_STYLES.find(
        (b) => b.id === state.selection.buttonStyleId,
      );
      if (btnStyle) {
        upsertToken(tokens, 'button-border-radius', btnStyle.borderRadius);
        upsertToken(tokens, 'button-font-weight', btnStyle.fontWeight);
        upsertToken(tokens, 'button-padding-x', btnStyle.paddingX);
      }

      // Merge Phase 3 navigation style token
      const navStyle = NAVIGATION_STYLES.find(
        (n) => n.id === state.selection.navigationStyleId,
      );
      if (navStyle) {
        upsertToken(tokens, 'nav-variant', navStyle.variant);
      }

      const outputs: Record<string, string> = {};
      if (format === 'css-variables') outputs['css-variables'] = tokensToCSS(tokens);
      if (format === 'json') outputs['json'] = tokensToJSON(tokens);

      machine.setExportPackage({
        tokens,
        swatches: selected.swatches,
        typography: typoPairing
          ? {
              ...selected.typography,
              headingFont: typoPairing.headingFont,
              bodyFont: typoPairing.bodyFont,
            }
          : selected.typography,
        outputs,
        generatedAt: new Date().toISOString(),
        sourceRecommendationId: selected.id,
      });

      trackExportTriggered(state.id, format);
    },
    [machine, state],
  );

  const toggleMood = (mood: StyleMood) => {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood],
    );
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const selectedRec = state.recommendations.find(
    (r) => r.id === state.selection.recommendationId,
  ) ?? null;

  const selectedTypographyPairing =
    TYPOGRAPHY_PAIRINGS.find((p) => p.id === state.selection.typographyPairingId) ?? null;
  const selectedButtonStyle =
    BUTTON_STYLES.find((b) => b.id === state.selection.buttonStyleId) ?? null;
  const selectedNavigationStyle =
    NAVIGATION_STYLES.find((n) => n.id === state.selection.navigationStyleId) ?? null;

  // Primary colour used to tint Phase 3 previews
  const previewPrimary =
    selectedRec?.swatches.find((s) => s.role === 'primary')?.hex ?? '#06b6d4';
  const previewAccent =
    selectedRec?.swatches.find((s) => s.role === 'accent')?.hex ?? previewPrimary;

  // Phase 4: name resolvers for the ConceptComparisonPanel
  const conceptNameResolvers = {
    typographyName: (id: string) =>
      TYPOGRAPHY_PAIRINGS.find((p) => p.id === id)?.name ?? id,
    buttonName: (id: string) =>
      BUTTON_STYLES.find((b) => b.id === id)?.name ?? id,
    navigationName: (id: string) =>
      NAVIGATION_STYLES.find((n) => n.id === id)?.name ?? id,
  };

  const canContinue = (() => {
    if (state.currentStepId === 'seeds') return selectedMoods.length > 0;
    return machine.canAdvance();
  })();

  const isLastStep = state.currentStepId === 'export';

  // ── Completed view ──────────────────────────────────────────────────────────
  if (state.status === 'completed') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-cyan-900/95 backdrop-blur-md">
        <div className="text-center space-y-6 p-8 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-cyan-400/20 flex items-center justify-center mx-auto">
            <i className="fa-solid fa-check text-cyan-400 text-2xl" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Style exported!</h2>
            <p className="text-white/50 text-sm">
              Your design tokens are ready. Apply them to your canvas or download the file.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold hover:from-cyan-400 hover:to-blue-400 transition-all duration-200"
          >
            Back to Canvas
          </button>
        </div>
      </div>
    );
  }

  // ── Main shell ──────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-950/95 via-slate-900/95 to-cyan-900/95 backdrop-blur-md">
      <div className="w-full max-w-3xl mx-4 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Style Flow</h1>
            <p className="text-white/50 text-sm mt-0.5">Build your design system in minutes.</p>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Close Style Flow"
            className="text-white/40 hover:text-white/80 transition-colors p-1"
          >
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        {/* Progress */}
        <StepProgress
          steps={JOURNEY_STEPS}
          currentStepId={state.currentStepId}
          completedSteps={state.completedSteps}
        />

        {/* Step content */}
        <div className="bg-white/[0.04] rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">

          {/* ── Step 1: Seeds ──────────────────────────────────────────────── */}
          {state.currentStepId === 'seeds' && (
            <div className="p-6 space-y-6">
              <div>
                <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
                  Choose your mood(s)
                </p>
                <div className="flex gap-2 flex-wrap">
                  {MOOD_OPTIONS.map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleMood(value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-cyan-400/50
                        ${
                          selectedMoods.includes(value)
                            ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300'
                            : 'bg-white/[0.04] border-white/10 text-white/60 hover:bg-white/[0.08] hover:border-white/20'
                        }`}
                    >
                      <i className={`${icon} text-[11px]`} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
                  Industry
                </label>
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value as StyleIndustry)}
                  className="w-full bg-white/[0.06] border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                >
                  {INDUSTRY_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value} className="bg-slate-800">
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
                  Notes <span className="text-white/20 normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. inspired by nature, avoiding red tones…"
                  rows={2}
                  className="w-full bg-white/[0.06] border border-white/15 rounded-lg px-3 py-2 text-white text-sm placeholder-white/25 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
              </div>
            </div>
          )}

          {/* ── Step 2: Concept Comparison (Phase 4 – #188, #189) ──────────── */}
          {state.currentStepId === 'recommendations' && (
            <div className="p-6 space-y-2">
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                Choose a concept
              </p>
              <p className="text-[11px] text-white/30 mb-4">
                Compare fully styled concepts. Favourite or shortlist options, then choose one to continue.
              </p>
              <ConceptComparisonPanel
                concepts={state.concepts}
                conceptReviews={state.conceptReviews}
                chosenConceptId={state.selection.finalConceptId}
                lockedAspects={state.selection.lockedAspects}
                resolvers={conceptNameResolvers}
                onChoose={handleChooseConcept}
                onReview={handleReviewConcept}
                onToggleLock={handleToggleLock}
                onRegenerate={handleRegenerateConcepts}
              />
            </div>
          )}

          {/* ── Step 3: Typography ──────────────────────────────────────── */}
          {state.currentStepId === 'typography' && (
            <div className="p-6 flex gap-4">
              <div className="flex-1">
                <TypographyPanel
                  selectedId={state.selection.typographyPairingId}
                  onSelect={handleSelectTypographyPairing}
                />
              </div>
              <div className="w-56 flex-shrink-0">
                <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
                  Preview
                </p>
                <PreviewScaffold
                  recommendation={selectedRec}
                  typographyPairing={selectedTypographyPairing}
                  buttonStyle={selectedButtonStyle}
                  navigationStyle={selectedNavigationStyle}
                />
                <p className="text-[9px] text-white/25 mt-2 italic">
                  This step is optional — continue to use the recommendation's default fonts.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 4: Button Style ─────────────────────────────────────── */}
          {state.currentStepId === 'buttons' && (
            <div className="p-6 flex gap-4">
              <div className="flex-1">
                <ButtonStylePanel
                  selectedId={state.selection.buttonStyleId}
                  accentColor={previewAccent}
                  onSelect={handleSelectButtonStyle}
                />
              </div>
              <div className="w-56 flex-shrink-0">
                <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
                  Preview
                </p>
                <PreviewScaffold
                  recommendation={selectedRec}
                  typographyPairing={selectedTypographyPairing}
                  buttonStyle={selectedButtonStyle}
                  navigationStyle={selectedNavigationStyle}
                />
                <p className="text-[9px] text-white/25 mt-2 italic">
                  This step is optional — continue to use rounded corners by default.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 5: Navigation ──────────────────────────────────────── */}
          {state.currentStepId === 'navigation' && (
            <div className="p-6 flex gap-4">
              <div className="flex-1">
                <NavigationStylePanel
                  selectedId={state.selection.navigationStyleId}
                  primaryColor={previewPrimary}
                  onSelect={handleSelectNavigationStyle}
                />
              </div>
              <div className="w-56 flex-shrink-0">
                <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
                  Preview
                </p>
                <PreviewScaffold
                  recommendation={selectedRec}
                  typographyPairing={selectedTypographyPairing}
                  buttonStyle={selectedButtonStyle}
                  navigationStyle={selectedNavigationStyle}
                />
                <p className="text-[9px] text-white/25 mt-2 italic">
                  This step is optional — continue to use a top-bar layout by default.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 6: Customisation ───────────────────────────────────────── */}
          {state.currentStepId === 'customisation' && (
            <div className="p-6 flex gap-4">
              <div className="flex-1 space-y-3">
                <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
                  Override tokens
                </p>
                {selectedRec?.tokens.map((token) => {
                  const overrideValue = state.selection.tokenOverrides[token.name];
                  const displayValue = overrideValue ?? token.value;
                  const isOverridden = Boolean(overrideValue);
                  return (
                    <div key={token.name} className="flex items-center gap-3">
                      {/* Colour swatch if it looks like a colour */}
                      {displayValue.startsWith('#') && (
                        <div
                          className="w-6 h-6 rounded flex-shrink-0 border border-white/10"
                          style={{ backgroundColor: displayValue }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-white/60 truncate">--{token.name}</p>
                      </div>
                      <input
                        type="text"
                        value={displayValue}
                        onChange={(e) => machine.overrideToken(token.name, e.target.value)}
                        className={`w-32 bg-white/[0.06] border rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-cyan-400/50 ${
                          isOverridden ? 'border-cyan-400/40' : 'border-white/10'
                        }`}
                      />
                      {isOverridden && (
                        <button
                          type="button"
                          title="Reset to default"
                          onClick={() => machine.clearTokenOverride(token.name)}
                          className="text-white/30 hover:text-white/70 transition-colors"
                        >
                          <i className="fa-solid fa-rotate-left text-[10px]" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="w-56 flex-shrink-0">
                <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">
                  Preview
                </p>
                <PreviewScaffold
                  recommendation={selectedRec}
                  typographyPairing={selectedTypographyPairing}
                  buttonStyle={selectedButtonStyle}
                  navigationStyle={selectedNavigationStyle}
                />
              </div>
            </div>
          )}

          {/* ── Step 7: Export ──────────────────────────────────────────────── */}
          {state.currentStepId === 'export' && (
            <div className="p-6 space-y-4">
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                Export format
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { format: 'css-variables' as const, label: 'CSS Variables', icon: 'fa-brands fa-css3-alt', description: ':root { --color-primary: … }' },
                  { format: 'json' as const, label: 'JSON Tokens', icon: 'fa-solid fa-code', description: '{ "color-primary": "…" }' },
                ].map(({ format, label, icon, description }) => {
                  const already = Boolean(state.exportPackage?.outputs[format]);
                  return (
                    <button
                      key={format}
                      type="button"
                      onClick={() => handleExport(format)}
                      className={`text-left rounded-xl border p-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/50
                        ${already
                          ? 'bg-cyan-500/10 border-cyan-400/40'
                          : 'bg-white/[0.06] border-white/10 hover:bg-white/[0.1] hover:border-white/25'
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <i className={`${icon} text-cyan-400 text-sm`} />
                        <span className="text-sm font-medium text-white">{label}</span>
                        {already && (
                          <i className="fa-solid fa-check text-cyan-400 text-[10px] ml-auto" />
                        )}
                      </div>
                      <p className="text-[10px] text-white/40 font-mono">{description}</p>
                    </button>
                  );
                })}
              </div>

              {/* Preview of generated output */}
              {state.exportPackage && (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                    Output preview
                  </p>
                  {Object.entries(state.exportPackage.outputs).map(([fmt, content]) => (
                    <pre
                      key={fmt}
                      className="bg-black/30 rounded-lg p-3 text-[10px] text-cyan-300 font-mono overflow-auto max-h-48"
                    >
                      {content}
                    </pre>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleRetreat}
            disabled={!machine.canRetreat()}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <i className="fa-solid fa-arrow-left text-[11px]" />
            Back
          </button>

          <button
            onClick={handleAdvance}
            disabled={!canContinue}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold shadow-lg hover:shadow-xl hover:from-cyan-400 hover:to-blue-400 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          >
            {isLastStep ? 'Finish' : 'Continue'}
            <i className="fa-solid fa-arrow-right ml-2 text-[11px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
