/**
 * flowValidation
 *
 * Validates selections made during the mobile guided flow and guards against
 * combinations that are unsupported or can only be edited in the desktop canvas.
 *
 * Issue #219 – Validate unsupported or desktop-only configuration paths
 */

import type { MobileComponentSelections, MobileDesignSnapshot } from './types';
import type { StyleMood, StyleIndustry } from '../style-flow/types';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Severity level of a validation finding. */
export type ValidationSeverity = 'error' | 'warning';

/** A single validation finding returned by the validator functions. */
export interface ValidationIssue {
  /** Machine-readable code for programmatic handling. */
  code: string;
  /** Human-readable explanation shown to the user. */
  message: string;
  /** Whether this blocks progression ('error') or is informational ('warning'). */
  severity: ValidationSeverity;
}

/** Parameters accepted by {@link validateFlowSelections}. */
export interface FlowSelectionParams {
  moods: StyleMood[];
  industry: StyleIndustry;
  colors?: string[];
  components?: Partial<MobileComponentSelections>;
}

// ── Validators ────────────────────────────────────────────────────────────────

/**
 * Validate the in-progress selections made during the mobile guided flow.
 *
 * Call this before advancing to the next step to catch unsupported
 * combinations early.  Returns an empty array when the configuration is valid.
 */
export function validateFlowSelections(params: FlowSelectionParams): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { moods, components } = params;

  // At least one mood is required to build a meaningful design
  if (moods.length === 0) {
    issues.push({
      code:     'NO_MOOD_SELECTED',
      message:  'Please select at least one mood to continue.',
      severity: 'error',
    });
  }

  // side-nav is a desktop-only layout pattern; it cannot be previewed on a
  // narrow mobile viewport and is not supported by the mobile canvas scaffold
  if (components?.navStyle === 'side-nav') {
    issues.push({
      code:     'DESKTOP_ONLY_NAV',
      message:  'Side navigation is a desktop-only pattern and cannot be previewed on mobile. Switch to "bottom-bar" or "top-bar".',
      severity: 'error',
    });
  }

  // Technical + Playful is an unsupported mood combination — they produce
  // contradictory design decisions in the palette and typography layers
  if (moods.includes('technical') && moods.includes('playful')) {
    issues.push({
      code:     'CONFLICTING_MOODS',
      message:  '"Technical" and "Playful" moods may produce inconsistent results. Choose one or the other for best quality.',
      severity: 'warning',
    });
  }

  return issues;
}

/**
 * Check whether a completed {@link MobileDesignSnapshot} can be handed off to
 * the desktop canvas editor without loss of information.
 *
 * Returns an empty array when the snapshot is fully compatible.
 */
export function validateSnapshotForDesktop(snapshot: MobileDesignSnapshot): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!snapshot.primaryColor || !snapshot.accentColor) {
    issues.push({
      code:     'MISSING_COLORS',
      message:  'Snapshot is missing required color values and cannot be applied to the canvas.',
      severity: 'error',
    });
  }

  if (!snapshot.headingFont || !snapshot.bodyFont) {
    issues.push({
      code:     'MISSING_FONTS',
      message:  'Snapshot is missing required font values and cannot be applied to the canvas.',
      severity: 'error',
    });
  }

  // side-nav cannot be fully represented in the mobile canvas layout spec but
  // it is not a hard blocker — the desktop editor can still open the spec
  if (snapshot.components?.navStyle === 'side-nav') {
    issues.push({
      code:     'DESKTOP_ONLY_NAV',
      message:  'This snapshot uses a desktop-only navigation pattern. It can still be opened in the desktop editor but may require manual adjustments.',
      severity: 'warning',
    });
  }

  return issues;
}
