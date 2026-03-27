/**
 * Shared type definitions for the mobile-first flow.
 *
 * Issue #206 – Design the simplified selection-based workflow
 * Issue #207 – Specify mobile information architecture and navigation
 */

/** The five entry points exposed on the mobile landing screen. */
export type MobileEntryPoint = 'theme' | 'color' | 'font' | 'image' | 'blank';

/**
 * Step IDs for the mobile guided flow.
 *
 *  entry   → user picks how to start (MobileEntryScreen)
 *  pick    → entry-point-specific selection (theme / color / font / image cards)
 *  refine  → one-tap refinements: mood chips + industry picker
 *  preview → full-screen visual preview of the assembled design system
 *  done    → export / share actions
 */
export type MobileFlowStep = 'entry' | 'pick' | 'refine' | 'preview' | 'done';

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
  /** Full token map (CSS-variable-name → resolved value). */
  tokens: Record<string, string>;
}
