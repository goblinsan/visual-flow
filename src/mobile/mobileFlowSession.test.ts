/**
 * Tests for mobile flow session persistence (Issue #217)
 * saveMobileFlowSession / loadMobileFlowSession / clearMobileFlowSession
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveMobileFlowSession,
  loadMobileFlowSession,
  clearMobileFlowSession,
} from '../utils/persistence';
import type { MobileFlowSessionState } from './types';

function makeSession(step: MobileFlowSessionState['step'] = 'refine'): MobileFlowSessionState {
  return {
    step,
    entry: 'color',
    pickState: {
      colors:   ['#1A1A2E', '#E94560'],
      moods:    ['minimal'],
      font:     null,
      industry: 'technology',
    },
    snapshot: null,
    savedAt:  1_000_000,
  };
}

describe('mobile flow session persistence (#217)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads a session state', () => {
    const session = makeSession('refine');
    saveMobileFlowSession(session);
    const loaded = loadMobileFlowSession();
    expect(loaded).not.toBeNull();
    expect(loaded?.step).toBe('refine');
    expect(loaded?.entry).toBe('color');
    expect(loaded?.pickState.colors).toEqual(['#1A1A2E', '#E94560']);
  });

  it('returns null when nothing has been saved', () => {
    expect(loadMobileFlowSession()).toBeNull();
  });

  it('clears a saved session', () => {
    saveMobileFlowSession(makeSession('components'));
    clearMobileFlowSession();
    expect(loadMobileFlowSession()).toBeNull();
  });

  it('overwrites an existing session with a newer one', () => {
    saveMobileFlowSession(makeSession('refine'));
    const updated = { ...makeSession('components'), savedAt: 2_000_000 };
    saveMobileFlowSession(updated);
    const loaded = loadMobileFlowSession();
    expect(loaded?.step).toBe('components');
    expect(loaded?.savedAt).toBe(2_000_000);
  });

  it('stores snapshot when components step is complete', () => {
    const session: MobileFlowSessionState = {
      ...makeSession('preview'),
      snapshot: {
        primaryColor: '#1A1A2E',
        accentColor:  '#E94560',
        headingFont:  'Inter',
        bodyFont:     'Inter',
        mood:         'minimal',
        industry:     'technology',
        tokens:       { 'color-primary': '#1A1A2E' },
      },
    };
    saveMobileFlowSession(session);
    const loaded = loadMobileFlowSession();
    expect(loaded?.snapshot?.primaryColor).toBe('#1A1A2E');
  });
});
