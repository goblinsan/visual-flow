/**
 * Shared type definitions for the mobile-first flow.
 *
 * Issue #206 – Design the simplified selection-based workflow
 * Issue #207 – Specify mobile information architecture and navigation
 * Issue #213 – Template and preset selection screens
 * Issue #214 – Component selection and configuration steps
 * Issue #215 – Lightweight live preview and summary review
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
  /** Resolved primary colour (hex). */
  primaryColor: string;
  /** Resolved accent colour (hex). */
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
