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
  /** Selected typography pairing ID (step 3) */
  typographyPairingId: string | null;
  /** Selected button style ID (step 4) */
  buttonStyleId: string | null;
  /** Selected navigation style ID (step 5) */
  navigationStyleId: string | null;
  /**
   * The concept chosen from the comparison panel (Phase 4 – #189).
   * When set, the individual step selections are pre-populated from this concept.
   */
  finalConceptId: string | null;
  /**
   * Aspects locked before generating new concept variations (Phase 4 – #188).
   * Locked aspects are held constant across all generated variants.
   */
  lockedAspects: LockableAspect[];
}

// ── Export Package ────────────────────────────────────────────────────────────

/** Format options for the exported style package */
export type ExportFormat = 'css-variables' | 'json' | 'tailwind-config' | 'react-tailwind';

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

// ── Typography Pairing ────────────────────────────────────────────────────────

/** A curated font pairing option for the typography selection step */
export interface TypographyPairing {
  /** Unique identifier */
  id: string;
  /** Display name, e.g. "Modern Sans" */
  name: string;
  /** Font family for headings */
  headingFont: string;
  /** Font family for body text */
  bodyFont: string;
  /** Short description of the pairing's character */
  description: string;
  /** Mood/style tags, e.g. ['minimal', 'clean'] */
  tags: string[];
}

// ── Button Style ──────────────────────────────────────────────────────────────

/** A button style family option */
export interface ButtonStyle {
  /** Unique identifier */
  id: string;
  /** Display name, e.g. "Pill" */
  name: string;
  /** Short description */
  description: string;
  /** CSS border-radius value */
  borderRadius: string;
  /** CSS font-weight value */
  fontWeight: string;
  /** Horizontal padding, e.g. '1rem' */
  paddingX: string;
  /** Whether the button uses an outline/border-only style by default */
  outlined: boolean;
}

// ── Navigation Style ──────────────────────────────────────────────────────────

/** Navigation layout variant identifier */
export type NavigationVariant = 'top-bar' | 'sidebar' | 'tab-bar' | 'floating' | 'bottom-bar';

/** A navigation layout style option */
export interface NavigationStyle {
  /** Unique identifier */
  id: string;
  /** Display name, e.g. "Top Bar" */
  name: string;
  /** Short description */
  description: string;
  /** Navigation layout variant */
  variant: NavigationVariant;
}

// ── Concept (Phase 4 – #188) ──────────────────────────────────────────────────

/**
 * A fully resolved style concept that bundles a colour recommendation with
 * pre-selected typography, button, and navigation choices.
 * Multiple distinct concepts are generated from the user's seeds and
 * presented in the comparison panel.
 */
export interface StyleConcept {
  /** Unique identifier for this concept */
  id: string;
  /** Human-readable concept name, e.g. "Ocean Bold" */
  name: string;
  /** Short tagline describing the concept's character */
  tagline: string;
  /** The colour recommendation that forms the visual base */
  recommendation: StyleRecommendation;
  /** Pre-selected typography pairing ID */
  typographyPairingId: string;
  /** Pre-selected button style ID */
  buttonStyleId: string;
  /** Pre-selected navigation style ID */
  navigationStyleId: string;
}

/** Per-concept review status in the comparison panel (Phase 4 – #189) */
export type ConceptReviewStatus = 'unseen' | 'viewed' | 'favorited' | 'shortlisted';

/**
 * Aspects of a style that can be "locked" before regenerating concept
 * variations. Locked aspects remain constant across all generated variants.
 * Phase 4 – #188
 */
export type LockableAspect = 'recommendation' | 'typography' | 'buttons' | 'navigation';

// ── Journey ───────────────────────────────────────────────────────────────────

/** Identifiers for each step in the style journey */
export type JourneyStepId =
  | 'seeds'
  | 'recommendations'
  | 'typography'
  | 'buttons'
  | 'navigation'
  | 'customisation'
  | 'export';

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
  /**
   * Full style concepts generated for the comparison step (Phase 4 – #188).
   * Each concept bundles a colour recommendation with pre-chosen typography,
   * button style, and navigation style.
   */
  concepts: StyleConcept[];
  /**
   * Per-concept review status keyed by concept ID (Phase 4 – #189).
   * Tracks which concepts have been viewed, favorited, or shortlisted.
   */
  conceptReviews: Record<string, ConceptReviewStatus>;
  /** User's current selections */
  selection: StyleSelection;
  /** Final export package (only present after completion) */
  exportPackage: StyleExportPackage | null;
  /** ISO timestamp when the journey started */
  startedAt: string;
  /** ISO timestamp of the last update */
  updatedAt: string;
}
