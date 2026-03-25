/**
 * Style Flow journey orchestration layer
 * Phase 1 (#175): State machine, validation, and save/resume behaviour.
 */

import type {
  JourneyState,
  JourneyStatus,
  JourneyStep,
  JourneyStepId,
  StyleExportPackage,
  StyleRecommendation,
  StyleSeed,
  StyleSelection,
} from './types';

// ── Step definitions ──────────────────────────────────────────────────────────

export const JOURNEY_STEPS: readonly JourneyStep[] = [
  {
    id: 'seeds',
    order: 1,
    title: 'Your Style Seeds',
    description: 'Tell us about the mood, industry, and colours that inspire you.',
    optional: false,
  },
  {
    id: 'recommendations',
    order: 2,
    title: 'Choose a Style',
    description: 'Pick the recommendation that best fits your vision.',
    optional: false,
  },
  {
    id: 'typography',
    order: 3,
    title: 'Typography',
    description: 'Choose a font pairing for headings and body text.',
    optional: true,
  },
  {
    id: 'buttons',
    order: 4,
    title: 'Button Style',
    description: 'Pick a button family to define your interactive elements.',
    optional: true,
  },
  {
    id: 'navigation',
    order: 5,
    title: 'Navigation',
    description: 'Choose a navigation pattern for your layout.',
    optional: true,
  },
  {
    id: 'customisation',
    order: 6,
    title: 'Customise',
    description: 'Fine-tune colours, typography, and other tokens.',
    optional: true,
  },
  {
    id: 'export',
    order: 7,
    title: 'Export',
    description: 'Download your design tokens in your preferred format.',
    optional: false,
  },
] as const;

// ── Validation ────────────────────────────────────────────────────────────────

/** Returns null when valid, or an error message when invalid */
type ValidationResult = string | null;

function validateSeeds(seeds: StyleSeed | null): ValidationResult {
  if (!seeds) return 'Style seeds are required.';
  if (seeds.moods.length === 0) return 'Select at least one mood.';
  return null;
}

function validateRecommendations(selection: StyleSelection): ValidationResult {
  if (!selection.recommendationId) {
    return 'Please choose a recommendation before continuing.';
  }
  return null;
}

function validateCustomisation(): ValidationResult {
  // Customisation is optional – always valid
  return null;
}

function validateTypography(): ValidationResult {
  // Typography selection is optional – always valid
  return null;
}

function validateButtons(): ValidationResult {
  // Button style selection is optional – always valid
  return null;
}

function validateNavigation(): ValidationResult {
  // Navigation style selection is optional – always valid
  return null;
}

function validateExport(exportPackage: StyleExportPackage | null): ValidationResult {
  if (!exportPackage) return 'Export package has not been generated yet.';
  return null;
}

const STEP_VALIDATORS: Record<JourneyStepId, (state: JourneyState) => ValidationResult> = {
  seeds: (s) => validateSeeds(s.seeds),
  recommendations: (s) => validateRecommendations(s.selection),
  typography: () => validateTypography(),
  buttons: () => validateButtons(),
  navigation: () => validateNavigation(),
  customisation: () => validateCustomisation(),
  export: (s) => validateExport(s.exportPackage),
};

// ── State machine ─────────────────────────────────────────────────────────────

export type JourneyStateListener = (state: Readonly<JourneyState>) => void;

function makeInitialState(id: string): JourneyState {
  const now = new Date().toISOString();
  return {
    id,
    status: 'idle',
    currentStepId: 'seeds',
    completedSteps: [],
    seeds: null,
    recommendations: [],
    selection: {
      recommendationId: null,
      tokenOverrides: {},
      typographyPairingId: null,
      buttonStyleId: null,
      navigationStyleId: null,
    },
    exportPackage: null,
    startedAt: now,
    updatedAt: now,
  };
}

function nextStepId(currentId: JourneyStepId): JourneyStepId | null {
  const current = JOURNEY_STEPS.find((s) => s.id === currentId);
  if (!current) return null;
  const next = JOURNEY_STEPS.find((s) => s.order === current.order + 1);
  return next?.id ?? null;
}

function prevStepId(currentId: JourneyStepId): JourneyStepId | null {
  const current = JOURNEY_STEPS.find((s) => s.id === currentId);
  if (!current) return null;
  const prev = JOURNEY_STEPS.find((s) => s.order === current.order - 1);
  return prev?.id ?? null;
}

/**
 * StyleFlowStateMachine
 *
 * Manages all transitions through the multi-step style journey.
 * Consumers subscribe to state changes and drive the UI accordingly.
 *
 * Usage:
 *   const machine = new StyleFlowStateMachine('session-id');
 *   const unsubscribe = machine.subscribe(state => renderUI(state));
 *   machine.start();
 *   machine.updateSeeds({ moods: ['minimal'], industry: 'technology' });
 *   machine.advance(); // → 'recommendations' step
 */
export class StyleFlowStateMachine {
  private state: JourneyState;
  private readonly listeners = new Set<JourneyStateListener>();

  constructor(sessionId: string, initialState?: JourneyState) {
    this.state = initialState ?? makeInitialState(sessionId);
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  getState(): Readonly<JourneyState> {
    return this.state;
  }

  /** Returns the definition of the current step */
  getCurrentStep(): JourneyStep {
    return JOURNEY_STEPS.find((s) => s.id === this.state.currentStepId)!;
  }

  /** Returns null when the current step is valid, or an error message */
  validate(): string | null {
    return STEP_VALIDATORS[this.state.currentStepId](this.state);
  }

  /** True when the current step has no validation errors */
  canAdvance(): boolean {
    return this.validate() === null;
  }

  /** True when there is a previous step to retreat to */
  canRetreat(): boolean {
    return prevStepId(this.state.currentStepId) !== null;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /** Start (or restart) the journey */
  start(): void {
    this.update({ status: 'in-progress' });
  }

  /** Pause the journey (saves progress implicitly via subscribers) */
  pause(): void {
    if (this.state.status !== 'in-progress') return;
    this.update({ status: 'paused' });
  }

  /** Resume a paused journey */
  resume(): void {
    if (this.state.status !== 'paused') return;
    this.update({ status: 'in-progress' });
  }

  /** Abandon the journey */
  abandon(): void {
    this.update({ status: 'abandoned' });
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  /**
   * Advance to the next step.
   * Returns false (and does not advance) when current step validation fails.
   */
  advance(): boolean {
    if (!this.canAdvance()) return false;

    const completedSteps = this.state.completedSteps.includes(this.state.currentStepId)
      ? this.state.completedSteps
      : [...this.state.completedSteps, this.state.currentStepId];

    const next = nextStepId(this.state.currentStepId);
    if (!next) {
      // Already on the last step – complete the journey
      this.update({ completedSteps, status: 'completed' });
      return true;
    }

    this.update({ completedSteps, currentStepId: next });
    return true;
  }

  /**
   * Retreat to the previous step.
   * Returns false when already on the first step.
   */
  retreat(): boolean {
    const prev = prevStepId(this.state.currentStepId);
    if (!prev) return false;
    this.update({ currentStepId: prev });
    return true;
  }

  // ── Step-specific mutations ───────────────────────────────────────────────

  /** Update the style seeds (step 1) */
  updateSeeds(seeds: StyleSeed): void {
    this.update({ seeds });
  }

  /** Replace the full list of available recommendations (step 2) */
  setRecommendations(recommendations: StyleRecommendation[]): void {
    this.update({ recommendations });
  }

  /** Record the user's chosen recommendation (step 2) */
  selectRecommendation(recommendationId: string): void {
    this.update({
      selection: { ...this.state.selection, recommendationId },
    });
  }

  /** Apply a token override (step 3) */
  overrideToken(tokenName: string, value: string): void {
    this.update({
      selection: {
        ...this.state.selection,
        tokenOverrides: { ...this.state.selection.tokenOverrides, [tokenName]: value },
      },
    });
  }

  /** Remove a previously applied token override */
  clearTokenOverride(tokenName: string): void {
    const overrides = { ...this.state.selection.tokenOverrides };
    delete overrides[tokenName];
    this.update({ selection: { ...this.state.selection, tokenOverrides: overrides } });
  }

  /** Record the user's chosen typography pairing (step 3) */
  selectTypographyPairing(pairingId: string): void {
    this.update({
      selection: { ...this.state.selection, typographyPairingId: pairingId },
    });
  }

  /** Record the user's chosen button style (step 4) */
  selectButtonStyle(styleId: string): void {
    this.update({
      selection: { ...this.state.selection, buttonStyleId: styleId },
    });
  }

  /** Record the user's chosen navigation style (step 5) */
  selectNavigationStyle(styleId: string): void {
    this.update({
      selection: { ...this.state.selection, navigationStyleId: styleId },
    });
  }

  /** Store the generated export package (step 7) */
  setExportPackage(exportPackage: StyleExportPackage): void {
    this.update({ exportPackage });
  }

  // ── Subscription ──────────────────────────────────────────────────────────

  subscribe(listener: JourneyStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private update(patch: Partial<JourneyState>): void {
    this.state = { ...this.state, ...patch, updatedAt: new Date().toISOString() };
    this.listeners.forEach((l) => l(this.state));
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Derive a JourneyStatus label suitable for display */
export function statusLabel(status: JourneyStatus): string {
  const labels: Record<JourneyStatus, string> = {
    idle: 'Not started',
    'in-progress': 'In progress',
    paused: 'Paused',
    completed: 'Completed',
    abandoned: 'Abandoned',
  };
  return labels[status];
}
