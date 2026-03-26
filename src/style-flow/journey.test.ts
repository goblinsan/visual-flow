/**
 * Tests for the Style Flow journey orchestration layer
 * Phase 1 (#175)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  StyleFlowStateMachine,
  JOURNEY_STEPS,
  statusLabel,
} from './journey';
import type { StyleRecommendation } from './types';

const MOCK_RECOMMENDATION: StyleRecommendation = {
  id: 'rec-1',
  name: 'Minimal Tech',
  description: 'A clean, minimal tech palette.',
  confidence: 0.9,
  swatches: [{ role: 'primary', hex: '#1A73E8' }],
  typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSizePx: 16, lineHeight: 1.6 },
  tokens: [{ name: 'color-primary', value: '#1A73E8' }],
};

describe('JOURNEY_STEPS', () => {
  it('contains exactly 7 steps', () => {
    expect(JOURNEY_STEPS).toHaveLength(7);
  });

  it('steps are ordered 1–7', () => {
    const orders = JOURNEY_STEPS.map((s) => s.order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('step IDs are seeds → recommendations → typography → buttons → navigation → customisation → export', () => {
    const ids = JOURNEY_STEPS.map((s) => s.id);
    expect(ids).toEqual([
      'seeds',
      'recommendations',
      'typography',
      'buttons',
      'navigation',
      'customisation',
      'export',
    ]);
  });

  it('typography, buttons, navigation, and customisation are optional steps', () => {
    const optional = JOURNEY_STEPS.filter((s) => s.optional).map((s) => s.id);
    expect(optional).toEqual(['typography', 'buttons', 'navigation', 'customisation']);
  });
});

describe('StyleFlowStateMachine', () => {
  let machine: StyleFlowStateMachine;

  beforeEach(() => {
    machine = new StyleFlowStateMachine('test-session');
  });

  // ── Initial state ─────────────────────────────────────────────────────────

  it('starts in idle status on the seeds step', () => {
    const state = machine.getState();
    expect(state.status).toBe('idle');
    expect(state.currentStepId).toBe('seeds');
    expect(state.completedSteps).toHaveLength(0);
  });

  it('start() transitions status to in-progress', () => {
    machine.start();
    expect(machine.getState().status).toBe('in-progress');
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('cannot advance from seeds when no seeds provided', () => {
    machine.start();
    expect(machine.canAdvance()).toBe(false);
    expect(machine.validate()).toMatch(/seeds are required/i);
  });

  it('cannot advance when seeds have no moods', () => {
    machine.start();
    machine.updateSeeds({ moods: [], industry: 'technology' });
    expect(machine.canAdvance()).toBe(false);
    expect(machine.validate()).toMatch(/at least one mood/i);
  });

  it('can advance from seeds when moods are set', () => {
    machine.start();
    machine.updateSeeds({ moods: ['minimal'], industry: 'technology' });
    expect(machine.canAdvance()).toBe(true);
    expect(machine.validate()).toBeNull();
  });

  it('cannot advance from recommendations when no selection made', () => {
    machine.start();
    machine.updateSeeds({ moods: ['minimal'], industry: 'technology' });
    machine.advance(); // → recommendations
    expect(machine.canAdvance()).toBe(false);
  });

  it('can advance from recommendations after selecting one', () => {
    machine.start();
    machine.updateSeeds({ moods: ['minimal'], industry: 'technology' });
    machine.setRecommendations([MOCK_RECOMMENDATION]);
    machine.advance(); // → recommendations
    machine.selectRecommendation('rec-1');
    expect(machine.canAdvance()).toBe(true);
  });

  // ── Navigation ────────────────────────────────────────────────────────────

  it('advance() moves through all steps to completed', () => {
    machine.start();

    // seeds → recommendations
    machine.updateSeeds({ moods: ['minimal'], industry: 'technology' });
    machine.setRecommendations([MOCK_RECOMMENDATION]);
    expect(machine.advance()).toBe(true);
    expect(machine.getState().currentStepId).toBe('recommendations');
    expect(machine.getState().completedSteps).toContain('seeds');

    // recommendations → typography (always valid since it's optional)
    machine.selectRecommendation('rec-1');
    expect(machine.advance()).toBe(true);
    expect(machine.getState().currentStepId).toBe('typography');
    expect(machine.getState().completedSteps).toContain('recommendations');

    // typography → buttons (always valid since it's optional)
    expect(machine.advance()).toBe(true);
    expect(machine.getState().currentStepId).toBe('buttons');

    // buttons → navigation (always valid since it's optional)
    expect(machine.advance()).toBe(true);
    expect(machine.getState().currentStepId).toBe('navigation');

    // navigation → customisation (always valid since it's optional)
    expect(machine.advance()).toBe(true);
    expect(machine.getState().currentStepId).toBe('customisation');

    // customisation → export (always valid since it's optional)
    expect(machine.advance()).toBe(true);
    expect(machine.getState().currentStepId).toBe('export');

    // export requires an export package
    machine.setExportPackage({
      tokens: [],
      swatches: [],
      typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSizePx: 16, lineHeight: 1.6 },
      outputs: { json: '{}' },
      generatedAt: new Date().toISOString(),
      sourceRecommendationId: 'rec-1',
    });
    expect(machine.advance()).toBe(true);
    expect(machine.getState().status).toBe('completed');
  });

  it('retreat() goes back to the previous step', () => {
    machine.start();
    machine.updateSeeds({ moods: ['minimal'], industry: 'technology' });
    machine.setRecommendations([MOCK_RECOMMENDATION]);
    machine.advance(); // → recommendations
    expect(machine.getState().currentStepId).toBe('recommendations');
    machine.retreat();
    expect(machine.getState().currentStepId).toBe('seeds');
  });

  it('canRetreat() is false on the first step', () => {
    expect(machine.canRetreat()).toBe(false);
  });

  it('canRetreat() is true on any step after the first', () => {
    machine.start();
    machine.updateSeeds({ moods: ['minimal'], industry: 'technology' });
    machine.setRecommendations([MOCK_RECOMMENDATION]);
    machine.advance(); // → recommendations
    expect(machine.canRetreat()).toBe(true);
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  it('pause() sets status to paused', () => {
    machine.start();
    machine.pause();
    expect(machine.getState().status).toBe('paused');
  });

  it('resume() sets status back to in-progress', () => {
    machine.start();
    machine.pause();
    machine.resume();
    expect(machine.getState().status).toBe('in-progress');
  });

  it('abandon() sets status to abandoned', () => {
    machine.start();
    machine.abandon();
    expect(machine.getState().status).toBe('abandoned');
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  it('overrideToken() stores a token override', () => {
    machine.overrideToken('color-primary', '#FF0000');
    expect(machine.getState().selection.tokenOverrides['color-primary']).toBe('#FF0000');
  });

  it('clearTokenOverride() removes a previously set override', () => {
    machine.overrideToken('color-primary', '#FF0000');
    machine.clearTokenOverride('color-primary');
    expect(machine.getState().selection.tokenOverrides['color-primary']).toBeUndefined();
  });

  it('selectTypographyPairing() stores the pairing ID', () => {
    machine.selectTypographyPairing('serif-elegance');
    expect(machine.getState().selection.typographyPairingId).toBe('serif-elegance');
  });

  it('selectButtonStyle() stores the button style ID', () => {
    machine.selectButtonStyle('pill');
    expect(machine.getState().selection.buttonStyleId).toBe('pill');
  });

  it('selectNavigationStyle() stores the navigation style ID', () => {
    machine.selectNavigationStyle('sidebar');
    expect(machine.getState().selection.navigationStyleId).toBe('sidebar');
  });

  // ── Subscription ──────────────────────────────────────────────────────────

  it('subscribe() is called on every state change', () => {
    const listener = vi.fn();
    machine.subscribe(listener);
    machine.start();
    machine.updateSeeds({ moods: ['minimal'], industry: 'technology' });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('unsubscribe() stops further notifications', () => {
    const listener = vi.fn();
    const unsub = machine.subscribe(listener);
    machine.start();
    unsub();
    machine.updateSeeds({ moods: ['minimal'], industry: 'technology' });
    expect(listener).toHaveBeenCalledTimes(1); // only the start() call
  });

  // ── Resume from saved state ───────────────────────────────────────────────

  it('can be initialised from a previously saved state', () => {
    machine.start();
    machine.updateSeeds({ moods: ['bold'], industry: 'gaming' });
    const snapshot = machine.getState();

    const resumed = new StyleFlowStateMachine('test-session', snapshot);
    expect(resumed.getState().seeds?.moods).toContain('bold');
    expect(resumed.getState().status).toBe('in-progress');
  });

  // ── getCurrentStep ────────────────────────────────────────────────────────

  it('getCurrentStep() returns the matching step definition', () => {
    const step = machine.getCurrentStep();
    expect(step.id).toBe('seeds');
    expect(step.order).toBe(1);
  });
});

describe('statusLabel', () => {
  it('returns the expected human-readable labels', () => {
    expect(statusLabel('idle')).toBe('Not started');
    expect(statusLabel('in-progress')).toBe('In progress');
    expect(statusLabel('paused')).toBe('Paused');
    expect(statusLabel('completed')).toBe('Completed');
    expect(statusLabel('abandoned')).toBe('Abandoned');
  });
});
