/**
 * Shared type definitions for the mobile-first flow.
 *
 * Issue #206 – Design the simplified selection-based workflow
 * Issue #207 – Specify mobile information architecture and navigation
 * Issue #213 – Template and preset selection screens
 * Issue #214 – Component selection and configuration steps
 * Issue #215 – Lightweight live preview and summary review
 * Issue #217 – Define mobile flow state model and persistence rules
 */

/** The entry points exposed on the mobile landing screen. */
export type MobileEntryPoint = 'theme' | 'color' | 'font' | 'image' | 'blank' | 'template';

/**
 * Step IDs for the mobile guided flow.
 *
 *  entry      → user picks how to start (MobileEntryScreen)
 *  pick       → entry-point-specific selection (theme / color / font / image / template cards)
 *  refine     → one-tap refinements: mood chips + industry picker
 *  components → component style selections (button / card / navigation)  #214
 *  preview    → phone-frame mock-up + summary review of the assembled design  #215
 *  done       → export / share actions
 */
export type MobileFlowStep = 'entry' | 'pick' | 'refine' | 'components' | 'preview' | 'done';

/**
 * Component style selections chosen in the components step.
 * Issue #214 – Component selection and configuration steps
 */
export interface MobileComponentSelections {
  /** Visual style for primary buttons. */
  buttonStyle: 'filled' | 'outlined' | 'ghost' | 'pill';
  /** Visual style for content cards. */
  cardStyle: 'flat' | 'elevated' | 'bordered' | 'gradient';
  /** Navigation pattern. */
  navStyle: 'bottom-bar' | 'top-bar' | 'side-nav';
}

/** Lightweight design snapshot produced at the end of the mobile flow. */
export interface MobileDesignSnapshot {
  /** Resolved primary color (hex). */
  primaryColor: string;
  /** Resolved accent color (hex). */
  accentColor: string;
  /** Heading font family. */
  headingFont: string;
  /** Body font family. */
  bodyFont: string;
  /** Selected mood label. */
  mood: string;
  /** Selected industry label. */
  industry: string;
  /** Component style selections (Issue #214). */
  components?: MobileComponentSelections;
  /** Full token map (CSS-variable-name → resolved value). */
  tokens: Record<string, string>;
}

/**
 * Persisted in-progress state for the mobile guided flow.
 * Stored to localStorage so the user can resume a partially completed session.
 * Issue #217 – Define mobile flow state model and persistence rules
 */
export interface MobileFlowSessionState {
  /** Current step in the guided flow. */
  step: MobileFlowStep;
  /** Selected entry point; null while the user is still on the 'entry' screen. */
  entry: MobileEntryPoint | null;
  /** Colors, moods, font, and industry accumulated during the pick step. */
  pickState: {
    colors: string[];
    moods: string[];
    font: { family: string; body: string } | null;
    industry: string | null;
  };
  /** Assembled snapshot; available once the components step completes. */
  snapshot: MobileDesignSnapshot | null;
  /** Unix epoch (ms) when this record was last written. */
  savedAt: number;
}
