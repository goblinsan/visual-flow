/**
 * Tests for the Mobile Flow telemetry layer
 * Issue #223 – Add analytics and launch checklist for rollout
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MOBILE_TELEMETRY_EVENTS,
  trackFlowStarted,
  trackStepViewed,
  trackStepCompleted,
  trackStepAbandoned,
  trackFlowCompleted,
  trackFlowAbandoned,
  trackSessionResumed,
  trackEntrySelected,
  trackTemplateSelected,
  trackComponentsSelected,
  trackTokensDownloaded,
} from './telemetry';
import type { MobileDesignSnapshot } from './types';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const SAMPLE_SNAPSHOT: MobileDesignSnapshot = {
  primaryColor: '#1A1A2E',
  accentColor: '#E94560',
  headingFont: 'Inter',
  bodyFont: 'Inter',
  mood: 'minimal',
  industry: 'technology',
  tokens: {
    'color-primary': '#1A1A2E',
    'color-accent': '#E94560',
    'font-heading': 'Inter',
    'font-body': 'Inter',
    'font-size-base': '16px',
    'line-height-base': '1.6',
  },
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Mobile Flow telemetry (#223)', () => {
  beforeEach(() => {
    // Ensure no analytics provider is registered so we use the CustomEvent fallback
    vi.stubGlobal('plausible', undefined);
    vi.stubGlobal('gtag', undefined);
    vi.stubGlobal('posthog', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── Event name constants ──────────────────────────────────────────────────

  it('MOBILE_TELEMETRY_EVENTS contains all expected event names', () => {
    expect(MOBILE_TELEMETRY_EVENTS.FLOW_STARTED).toBe('mobile_flow_started');
    expect(MOBILE_TELEMETRY_EVENTS.STEP_VIEWED).toBe('mobile_flow_step_viewed');
    expect(MOBILE_TELEMETRY_EVENTS.STEP_COMPLETED).toBe('mobile_flow_step_completed');
    expect(MOBILE_TELEMETRY_EVENTS.STEP_ABANDONED).toBe('mobile_flow_step_abandoned');
    expect(MOBILE_TELEMETRY_EVENTS.FLOW_COMPLETED).toBe('mobile_flow_completed');
    expect(MOBILE_TELEMETRY_EVENTS.FLOW_ABANDONED).toBe('mobile_flow_abandoned');
    expect(MOBILE_TELEMETRY_EVENTS.SESSION_RESUMED).toBe('mobile_flow_session_resumed');
    expect(MOBILE_TELEMETRY_EVENTS.ENTRY_SELECTED).toBe('mobile_flow_entry_selected');
    expect(MOBILE_TELEMETRY_EVENTS.TEMPLATE_SELECTED).toBe('mobile_flow_template_selected');
    expect(MOBILE_TELEMETRY_EVENTS.COMPONENTS_SELECTED).toBe('mobile_flow_components_selected');
    expect(MOBILE_TELEMETRY_EVENTS.TOKENS_DOWNLOADED).toBe('mobile_flow_tokens_downloaded');
  });

  // ── Individual tracking helpers ───────────────────────────────────────────

  it('trackFlowStarted fires with session_id', () => {
    const { captured, cleanup } = captureAnalyticsEvents();
    trackFlowStarted('session-001');
    expect(captured).toHaveLength(1);
    expect(captured[0].eventName).toBe('mobile_flow_started');
    expect(captured[0].props).toMatchObject({ session_id: 'session-001' });
    cleanup();
  });

  it('trackStepViewed fires with session_id and step', () => {
    const { captured, cleanup } = captureAnalyticsEvents();
    trackStepViewed('session-001', 'refine');
    expect(captured[0].eventName).toBe('mobile_flow_step_viewed');
    expect(captured[0].props).toMatchObject({ session_id: 'session-001', step: 'refine' });
    cleanup();
  });

  it('trackStepCompleted fires with session_id, step and duration_ms', () => {
    const { captured, cleanup } = captureAnalyticsEvents();
    trackStepCompleted('session-001', 'components', 3500);
    expect(captured[0].eventName).toBe('mobile_flow_step_completed');
    expect(captured[0].props).toMatchObject({
      session_id: 'session-001',
      step: 'components',
      duration_ms: 3500,
    });
    cleanup();
  });

  it('trackStepAbandoned fires with session_id and step', () => {
    const { captured, cleanup } = captureAnalyticsEvents();
    trackStepAbandoned('session-001', 'pick');
    expect(captured[0].eventName).toBe('mobile_flow_step_abandoned');
    expect(captured[0].props).toMatchObject({ session_id: 'session-001', step: 'pick' });
    cleanup();
  });

  it('trackFlowCompleted fires with session_id, mood, industry, and total_duration_ms', () => {
    const { captured, cleanup } = captureAnalyticsEvents();
    trackFlowCompleted('session-001', SAMPLE_SNAPSHOT, 120000);
    expect(captured[0].eventName).toBe('mobile_flow_completed');
    expect(captured[0].props).toMatchObject({
      session_id: 'session-001',
      mood: 'minimal',
      industry: 'technology',
      total_duration_ms: 120000,
    });
    cleanup();
  });

  it('trackFlowAbandoned fires with session_id and last_step', () => {
    const { captured, cleanup } = captureAnalyticsEvents();
    trackFlowAbandoned('session-001', 'refine');
    expect(captured[0].eventName).toBe('mobile_flow_abandoned');
    expect(captured[0].props).toMatchObject({ session_id: 'session-001', last_step: 'refine' });
    cleanup();
  });

  it('trackSessionResumed fires with session_id and resumed_at_step', () => {
    const { captured, cleanup } = captureAnalyticsEvents();
    trackSessionResumed('session-001', 'components');
    expect(captured[0].eventName).toBe('mobile_flow_session_resumed');
    expect(captured[0].props).toMatchObject({
      session_id: 'session-001',
      resumed_at_step: 'components',
    });
    cleanup();
  });

  it('trackEntrySelected fires with session_id and entry_point', () => {
    const { captured, cleanup } = captureAnalyticsEvents();
    trackEntrySelected('session-001', 'template');
    expect(captured[0].eventName).toBe('mobile_flow_entry_selected');
    expect(captured[0].props).toMatchObject({ session_id: 'session-001', entry_point: 'template' });
    cleanup();
  });

  it('trackTemplateSelected fires with session_id and template_id', () => {
    const { captured, cleanup } = captureAnalyticsEvents();
    trackTemplateSelected('session-001', 'saas-dashboard');
    expect(captured[0].eventName).toBe('mobile_flow_template_selected');
    expect(captured[0].props).toMatchObject({
      session_id: 'session-001',
      template_id: 'saas-dashboard',
    });
    cleanup();
  });

  it('trackComponentsSelected fires with all three component styles', () => {
    const { captured, cleanup } = captureAnalyticsEvents();
    trackComponentsSelected('session-001', 'pill', 'gradient', 'side-nav');
    expect(captured[0].eventName).toBe('mobile_flow_components_selected');
    expect(captured[0].props).toMatchObject({
      session_id: 'session-001',
      button_style: 'pill',
      card_style: 'gradient',
      nav_style: 'side-nav',
    });
    cleanup();
  });

  it('trackTokensDownloaded fires with session_id', () => {
    const { captured, cleanup } = captureAnalyticsEvents();
    trackTokensDownloaded('session-001');
    expect(captured[0].eventName).toBe('mobile_flow_tokens_downloaded');
    expect(captured[0].props).toMatchObject({ session_id: 'session-001' });
    cleanup();
  });

  // ── Provider delegation ───────────────────────────────────────────────────

  it('delegates to Plausible when available', () => {
    const plausible = vi.fn();
    vi.stubGlobal('plausible', plausible);
    trackFlowStarted('session-plausible');
    expect(plausible).toHaveBeenCalledWith('mobile_flow_started', {
      props: { session_id: 'session-plausible' },
    });
  });

  it('delegates to gtag when Plausible is not available', () => {
    const gtag = vi.fn();
    vi.stubGlobal('gtag', gtag);
    trackEntrySelected('session-gtag', 'color');
    expect(gtag).toHaveBeenCalledWith('event', 'mobile_flow_entry_selected', {
      session_id: 'session-gtag',
      entry_point: 'color',
    });
  });
});
