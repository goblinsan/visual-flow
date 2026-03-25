/**
 * Tests for the Style Flow telemetry layer
 * Phase 1 (#177)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  TELEMETRY_EVENTS,
  trackJourneyStarted,
  trackStepViewed,
  trackStepCompleted,
  trackStepAbandoned,
  trackJourneyCompleted,
  trackJourneyAbandoned,
  trackJourneyResumed,
  trackRecommendationSelected,
  trackExportTriggered,
} from './telemetry';

// Capture analytics events dispatched as CustomEvents (fallback path)
function captureAnalyticsEvents() {
  const captured: { eventName: string; props: Record<string, unknown> }[] = [];
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    captured.push(detail);
  };
  window.addEventListener('vizail:analytics', handler);
  return {
    captured,
    cleanup: () => window.removeEventListener('vizail:analytics', handler),
  };
}

describe('Style Flow telemetry', () => {
  beforeEach(() => {
    // Ensure no provider is registered so we hit the CustomEvent fallback
    vi.stubGlobal('plausible', undefined);
    vi.stubGlobal('gtag', undefined);
    vi.stubGlobal('posthog', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('TELEMETRY_EVENTS contains the expected event names', () => {
    expect(TELEMETRY_EVENTS.JOURNEY_STARTED).toBe('style_flow_started');
    expect(TELEMETRY_EVENTS.STEP_VIEWED).toBe('style_flow_step_viewed');
    expect(TELEMETRY_EVENTS.STEP_COMPLETED).toBe('style_flow_step_completed');
    expect(TELEMETRY_EVENTS.STEP_ABANDONED).toBe('style_flow_step_abandoned');
    expect(TELEMETRY_EVENTS.JOURNEY_COMPLETED).toBe('style_flow_completed');
    expect(TELEMETRY_EVENTS.JOURNEY_ABANDONED).toBe('style_flow_abandoned');
    expect(TELEMETRY_EVENTS.JOURNEY_RESUMED).toBe('style_flow_resumed');
    expect(TELEMETRY_EVENTS.RECOMMENDATION_SELECTED).toBe('style_flow_recommendation_selected');
    expect(TELEMETRY_EVENTS.EXPORT_TRIGGERED).toBe('style_flow_export_triggered');
  });

  it('trackJourneyStarted fires with session_id', () => {
    const { captured, cleanup } = captureAnalyticsEvents();
    trackJourneyStarted('session-123');
    expect(captured).toHaveLength(1);
    expect(captured[0].eventName).toBe('style_flow_started');
    expect(captured[0].props).toMatchObject({ session_id: 'session-123' });
    cleanup();
  });

  it('trackStepViewed fires with session_id and step', () => {
    const { captured, cleanup } = captureAnalyticsEvents();
    trackStepViewed('session-123', 'seeds');
    expect(captured[0].eventName).toBe('style_flow_step_viewed');
    expect(captured[0].props).toMatchObject({ session_id: 'session-123', step: 'seeds' });
    cleanup();
  });

  it('trackStepCompleted fires with duration_ms', () => {
    const { captured, cleanup } = captureAnalyticsEvents();
    trackStepCompleted('session-123', 'seeds', 4200);
    expect(captured[0].eventName).toBe('style_flow_step_completed');
    expect(captured[0].props).toMatchObject({
      session_id: 'session-123',
      step: 'seeds',
      duration_ms: 4200,
    });
    cleanup();
  });

  it('trackStepAbandoned fires with session_id and step', () => {
    const { captured, cleanup } = captureAnalyticsEvents();
    trackStepAbandoned('session-123', 'recommendations');
    expect(captured[0].eventName).toBe('style_flow_step_abandoned');
    expect(captured[0].props).toMatchObject({
      session_id: 'session-123',
      step: 'recommendations',
    });
    cleanup();
  });

  it('trackJourneyCompleted fires with total_duration_ms', () => {
    const { captured, cleanup } = captureAnalyticsEvents();
    trackJourneyCompleted('session-123', 90000);
    expect(captured[0].eventName).toBe('style_flow_completed');
    expect(captured[0].props).toMatchObject({
      session_id: 'session-123',
      total_duration_ms: 90000,
    });
    cleanup();
  });

  it('trackJourneyAbandoned fires with last_step and status', () => {
    const { captured, cleanup } = captureAnalyticsEvents();
    trackJourneyAbandoned('session-123', 'recommendations', 'in-progress');
    expect(captured[0].eventName).toBe('style_flow_abandoned');
    expect(captured[0].props).toMatchObject({
      session_id: 'session-123',
      last_step: 'recommendations',
      status: 'in-progress',
    });
    cleanup();
  });

  it('trackJourneyResumed fires with resumed_at_step', () => {
    const { captured, cleanup } = captureAnalyticsEvents();
    trackJourneyResumed('session-123', 'customisation');
    expect(captured[0].eventName).toBe('style_flow_resumed');
    expect(captured[0].props).toMatchObject({
      session_id: 'session-123',
      resumed_at_step: 'customisation',
    });
    cleanup();
  });

  it('trackRecommendationSelected fires with recommendation_id', () => {
    const { captured, cleanup } = captureAnalyticsEvents();
    trackRecommendationSelected('session-123', 'rec-minimal-1');
    expect(captured[0].eventName).toBe('style_flow_recommendation_selected');
    expect(captured[0].props).toMatchObject({
      session_id: 'session-123',
      recommendation_id: 'rec-minimal-1',
    });
    cleanup();
  });

  it('trackExportTriggered fires with format', () => {
    const { captured, cleanup } = captureAnalyticsEvents();
    trackExportTriggered('session-123', 'css-variables');
    expect(captured[0].eventName).toBe('style_flow_export_triggered');
    expect(captured[0].props).toMatchObject({
      session_id: 'session-123',
      format: 'css-variables',
    });
    cleanup();
  });

  it('delegates to Plausible when available', () => {
    const plausible = vi.fn();
    vi.stubGlobal('plausible', plausible);
    trackJourneyStarted('session-plausible');
    expect(plausible).toHaveBeenCalledWith('style_flow_started', {
      props: { session_id: 'session-plausible' },
    });
  });
});
