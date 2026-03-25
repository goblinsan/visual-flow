/**
 * Style Flow telemetry
 * Phase 1 (#177): Track journey progress, outcomes, and abandonment by step.
 *
 * Delegates to the shared analytics helper so all registered providers
 * (Plausible, gtag, PostHog, custom events) receive the events.
 */

import { trackEvent } from '../utils/analytics';
import type { JourneyStepId, JourneyStatus } from './types';

// ── Event names ───────────────────────────────────────────────────────────────

export const TELEMETRY_EVENTS = {
  JOURNEY_STARTED: 'style_flow_started',
  STEP_VIEWED: 'style_flow_step_viewed',
  STEP_COMPLETED: 'style_flow_step_completed',
  STEP_ABANDONED: 'style_flow_step_abandoned',
  JOURNEY_COMPLETED: 'style_flow_completed',
  JOURNEY_ABANDONED: 'style_flow_abandoned',
  JOURNEY_RESUMED: 'style_flow_resumed',
  RECOMMENDATION_SELECTED: 'style_flow_recommendation_selected',
  EXPORT_TRIGGERED: 'style_flow_export_triggered',
} as const;

// ── Tracking helpers ──────────────────────────────────────────────────────────

/** Fired when the user begins a new style flow journey */
export function trackJourneyStarted(sessionId: string): void {
  trackEvent(TELEMETRY_EVENTS.JOURNEY_STARTED, { session_id: sessionId });
}

/** Fired each time the user lands on a step */
export function trackStepViewed(sessionId: string, stepId: JourneyStepId): void {
  trackEvent(TELEMETRY_EVENTS.STEP_VIEWED, { session_id: sessionId, step: stepId });
}

/** Fired when the user successfully advances past a step */
export function trackStepCompleted(
  sessionId: string,
  stepId: JourneyStepId,
  durationMs: number,
): void {
  trackEvent(TELEMETRY_EVENTS.STEP_COMPLETED, {
    session_id: sessionId,
    step: stepId,
    duration_ms: durationMs,
  });
}

/**
 * Fired when the user leaves a step without completing it
 * (e.g. closes the shell or navigates away mid-step).
 */
export function trackStepAbandoned(sessionId: string, stepId: JourneyStepId): void {
  trackEvent(TELEMETRY_EVENTS.STEP_ABANDONED, { session_id: sessionId, step: stepId });
}

/** Fired when the journey reaches the 'completed' status */
export function trackJourneyCompleted(sessionId: string, totalDurationMs: number): void {
  trackEvent(TELEMETRY_EVENTS.JOURNEY_COMPLETED, {
    session_id: sessionId,
    total_duration_ms: totalDurationMs,
  });
}

/** Fired when the journey reaches the 'abandoned' status */
export function trackJourneyAbandoned(
  sessionId: string,
  lastStep: JourneyStepId,
  status: JourneyStatus,
): void {
  trackEvent(TELEMETRY_EVENTS.JOURNEY_ABANDONED, {
    session_id: sessionId,
    last_step: lastStep,
    status,
  });
}

/** Fired when the user resumes a previously paused journey */
export function trackJourneyResumed(sessionId: string, resumedAtStep: JourneyStepId): void {
  trackEvent(TELEMETRY_EVENTS.JOURNEY_RESUMED, {
    session_id: sessionId,
    resumed_at_step: resumedAtStep,
  });
}

/** Fired when the user picks a recommendation card */
export function trackRecommendationSelected(
  sessionId: string,
  recommendationId: string,
): void {
  trackEvent(TELEMETRY_EVENTS.RECOMMENDATION_SELECTED, {
    session_id: sessionId,
    recommendation_id: recommendationId,
  });
}

/** Fired when the user triggers an export */
export function trackExportTriggered(sessionId: string, format: string): void {
  trackEvent(TELEMETRY_EVENTS.EXPORT_TRIGGERED, {
    session_id: sessionId,
    format,
  });
}
