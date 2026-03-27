/**
 * Mobile Flow telemetry
 *
 * Tracks user progress through the mobile-first guided design flow.
 * Events mirror the pattern established by the Style Flow telemetry layer
 * (src/style-flow/telemetry.ts) and delegate to the same shared analytics
 * helper so all registered providers (Plausible, gtag, PostHog, custom events)
 * receive the events automatically.
 *
 * Issue #223 – Add analytics and launch checklist for rollout
 */

import { trackEvent } from '../utils/analytics';
import type { MobileEntryPoint, MobileFlowStep, MobileDesignSnapshot } from './types';

// ── Event names ───────────────────────────────────────────────────────────────

export const MOBILE_TELEMETRY_EVENTS = {
  /** User begins the mobile flow (first entry-point selection). */
  FLOW_STARTED: 'mobile_flow_started',
  /** User lands on a step for the first time. */
  STEP_VIEWED: 'mobile_flow_step_viewed',
  /** User successfully advances past a step. */
  STEP_COMPLETED: 'mobile_flow_step_completed',
  /** User abandons a step (unmounts without completing). */
  STEP_ABANDONED: 'mobile_flow_step_abandoned',
  /** User confirms their design at the end of the flow. */
  FLOW_COMPLETED: 'mobile_flow_completed',
  /** User's session ends before reaching "done". */
  FLOW_ABANDONED: 'mobile_flow_abandoned',
  /** User resumes a previously persisted session. */
  SESSION_RESUMED: 'mobile_flow_session_resumed',
  /** User picks a specific entry point. */
  ENTRY_SELECTED: 'mobile_flow_entry_selected',
  /** User selects a template preset. */
  TEMPLATE_SELECTED: 'mobile_flow_template_selected',
  /** User confirms component style choices. */
  COMPONENTS_SELECTED: 'mobile_flow_components_selected',
  /** User downloads the CSS token file. */
  TOKENS_DOWNLOADED: 'mobile_flow_tokens_downloaded',
} as const;

// ── Tracking helpers ──────────────────────────────────────────────────────────

/** Fired when the user begins a new mobile flow session. */
export function trackFlowStarted(sessionId: string): void {
  trackEvent(MOBILE_TELEMETRY_EVENTS.FLOW_STARTED, { session_id: sessionId });
}

/** Fired each time the user lands on a step. */
export function trackStepViewed(sessionId: string, step: MobileFlowStep): void {
  trackEvent(MOBILE_TELEMETRY_EVENTS.STEP_VIEWED, { session_id: sessionId, step });
}

/** Fired when the user successfully advances past a step. */
export function trackStepCompleted(
  sessionId: string,
  step: MobileFlowStep,
  durationMs: number,
): void {
  trackEvent(MOBILE_TELEMETRY_EVENTS.STEP_COMPLETED, {
    session_id: sessionId,
    step,
    duration_ms: durationMs,
  });
}

/**
 * Fired when the user leaves a step without completing it
 * (e.g. navigates back or closes the app mid-flow).
 */
export function trackStepAbandoned(sessionId: string, step: MobileFlowStep): void {
  trackEvent(MOBILE_TELEMETRY_EVENTS.STEP_ABANDONED, { session_id: sessionId, step });
}

/** Fired when the user reaches the "done" screen and confirms their design. */
export function trackFlowCompleted(
  sessionId: string,
  snapshot: MobileDesignSnapshot,
  totalDurationMs: number,
): void {
  trackEvent(MOBILE_TELEMETRY_EVENTS.FLOW_COMPLETED, {
    session_id: sessionId,
    mood: snapshot.mood,
    industry: snapshot.industry,
    total_duration_ms: totalDurationMs,
  });
}

/** Fired when the session ends before the user reaches "done". */
export function trackFlowAbandoned(sessionId: string, lastStep: MobileFlowStep): void {
  trackEvent(MOBILE_TELEMETRY_EVENTS.FLOW_ABANDONED, {
    session_id: sessionId,
    last_step: lastStep,
  });
}

/** Fired when the user resumes a previously saved session. */
export function trackSessionResumed(sessionId: string, resumedAtStep: MobileFlowStep): void {
  trackEvent(MOBILE_TELEMETRY_EVENTS.SESSION_RESUMED, {
    session_id: sessionId,
    resumed_at_step: resumedAtStep,
  });
}

/** Fired when the user selects an entry point on the landing screen. */
export function trackEntrySelected(sessionId: string, entryPoint: MobileEntryPoint): void {
  trackEvent(MOBILE_TELEMETRY_EVENTS.ENTRY_SELECTED, {
    session_id: sessionId,
    entry_point: entryPoint,
  });
}

/** Fired when the user picks a specific template preset. */
export function trackTemplateSelected(sessionId: string, templateId: string): void {
  trackEvent(MOBILE_TELEMETRY_EVENTS.TEMPLATE_SELECTED, {
    session_id: sessionId,
    template_id: templateId,
  });
}

/** Fired when the user confirms their component style choices. */
export function trackComponentsSelected(
  sessionId: string,
  buttonStyle: string,
  cardStyle: string,
  navStyle: string,
): void {
  trackEvent(MOBILE_TELEMETRY_EVENTS.COMPONENTS_SELECTED, {
    session_id: sessionId,
    button_style: buttonStyle,
    card_style: cardStyle,
    nav_style: navStyle,
  });
}

/** Fired when the user downloads the CSS token file. */
export function trackTokensDownloaded(sessionId: string): void {
  trackEvent(MOBILE_TELEMETRY_EVENTS.TOKENS_DOWNLOADED, { session_id: sessionId });
}
