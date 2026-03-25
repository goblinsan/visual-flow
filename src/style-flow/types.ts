/**
 * Style Flow domain model
 * Phase 1 (#174): Define seeds, selections, recommendation contracts,
 * and export package model.
 */

// ── Seeds ─────────────────────────────────────────────────────────────────────

/** Mood influence for the style journey */
export type StyleMood = 'minimal' | 'bold' | 'playful' | 'elegant' | 'technical';

/** Industry context for the style journey */
export type StyleIndustry =
  | 'technology'
  | 'fashion'
  | 'finance'
  | 'health'
  | 'education'
  | 'gaming'
  | 'food'
  | 'other';

/**
 * Initial inputs supplied by the user to seed the style recommendation engine.
 */
export interface StyleSeed {
  /** One or more mood keywords that define the desired feel */
  moods: StyleMood[];
  /** Industry or domain context */
  industry: StyleIndustry;
  /**
   * Optional base colours provided by the user (hex strings).
   * When omitted, the engine derives a palette from the moods.
   */
  baseColors?: string[];
  /**
   * Optional typography preferences (font family names).
   * When omitted, the engine picks from a curated set.
   */
  fontPreferences?: string[];
  /** Free-form notes to guide the recommendation */
  notes?: string;
}

// ── Recommendations ───────────────────────────────────────────────────────────

/** A single design token (name → value mapping) */
export interface DesignToken {
  /** CSS-custom-property-style name, e.g. "color-primary" */
  name: string;
  /** Resolved value, e.g. "#1A73E8" or "16px" */
  value: string;
  /** Human-readable description of the token's role */
  description?: string;
}

/** A colour swatch within a recommendation */
export interface ColorSwatch {
  /** Semantic role, e.g. "primary", "accent", "surface" */
  role: string;
  /** Hex colour value */
  hex: string;
}

/** Typography specification within a recommendation */
export interface TypographySpec {
  /** Font family for headings */
  headingFont: string;
  /** Font family for body copy */
  bodyFont: string;
  /** Base body font size in px */
  baseSizePx: number;
  /** Line-height ratio */
  lineHeight: number;
}

/**
 * A single style recommendation generated from the seeds.
 * Multiple recommendations are presented to the user as cards.
 */
export interface StyleRecommendation {
  /** Unique ID for this recommendation */
  id: string;
  /** Display name, e.g. "Ocean Breeze" */
  name: string;
  /** Short description of the style */
  description: string;
  /** Colour swatches for visual preview */
  swatches: ColorSwatch[];
  /** Typography specification */
  typography: TypographySpec;
  /** Full set of design tokens for this recommendation */
  tokens: DesignToken[];
  /** Confidence score from the engine (0–1) */
  confidence: number;
}

// ── Selections ────────────────────────────────────────────────────────────────

/**
 * User-made choices captured during the style journey.
 */
export interface StyleSelection {
  /** The recommendation chosen by the user (ID reference) */
  recommendationId: string | null;
  /**
   * Any tokens that the user has explicitly overridden after choosing
   * a recommendation. Keys are token names.
   */
  tokenOverrides: Record<string, string>;
}

// ── Export Package ────────────────────────────────────────────────────────────

/** Format options for the exported style package */
export type ExportFormat = 'css-variables' | 'json' | 'tailwind-config';

/**
 * The final exportable artifact produced at the end of the journey.
 */
export interface StyleExportPackage {
  /** The resolved set of design tokens (merged overrides applied) */
  tokens: DesignToken[];
  /** Colour swatches from the selected recommendation */
  swatches: ColorSwatch[];
  /** Typography spec */
  typography: TypographySpec;
  /**
   * Serialised outputs keyed by format.
   * Consumers can request one or more formats.
   */
  outputs: Partial<Record<ExportFormat, string>>;
  /** ISO timestamp of when the package was generated */
  generatedAt: string;
  /** ID of the recommendation this package was derived from */
  sourceRecommendationId: string;
}

// ── Journey ───────────────────────────────────────────────────────────────────

/** Identifiers for each step in the style journey */
export type JourneyStepId = 'seeds' | 'recommendations' | 'customisation' | 'export';

/** Definition of a single step */
export interface JourneyStep {
  id: JourneyStepId;
  /** Ordinal position, 1-based */
  order: number;
  /** Human-readable title */
  title: string;
  /** Short description shown below the title */
  description: string;
  /** Whether the step can be skipped */
  optional: boolean;
}

/** Status of the style flow journey */
export type JourneyStatus = 'idle' | 'in-progress' | 'paused' | 'completed' | 'abandoned';

/**
 * Full runtime state of a Style Flow journey session.
 */
export interface JourneyState {
  /** Unique session identifier */
  id: string;
  /** Current status */
  status: JourneyStatus;
  /** The step the user is currently on */
  currentStepId: JourneyStepId;
  /** IDs of steps that have been completed */
  completedSteps: JourneyStepId[];
  /** Seeds provided at step 1 */
  seeds: StyleSeed | null;
  /** Available recommendations derived from seeds */
  recommendations: StyleRecommendation[];
  /** User's current selections */
  selection: StyleSelection;
  /** Final export package (only present after completion) */
  exportPackage: StyleExportPackage | null;
  /** ISO timestamp when the journey started */
  startedAt: string;
  /** ISO timestamp of the last update */
  updatedAt: string;
}
