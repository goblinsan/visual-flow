/**
 * Tests for the Style Flow persistence layer
 * Phase 1 (#175, #177)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LocalStorageStyleFlowStorage,
  defaultStyleFlowStorage,
} from './persistence';
import type { JourneyState } from './types';

function makeState(id: string, status: JourneyState['status'] = 'in-progress'): JourneyState {
  const now = new Date().toISOString();
  return {
    id,
    status,
    currentStepId: 'seeds',
    completedSteps: [],
    seeds: null,
    recommendations: [],
    selection: {
      recommendationId: null,
      tokenOverrides: {},
      typographyPairingId: null,
      buttonStyleId: null,
      navigationStyleId: null,
      finalConceptId: null,
      lockedAspects: [],
    },
    exportPackage: null,
    startedAt: now,
    updatedAt: now,
  };
}

describe('LocalStorageStyleFlowStorage', () => {
  let storage: LocalStorageStyleFlowStorage;

  beforeEach(() => {
    localStorage.clear();
    storage = new LocalStorageStyleFlowStorage();
  });

  it('saves and loads a journey state', async () => {
    const state = makeState('session-1');
    await storage.save(state);
    const loaded = await storage.load('session-1');
    expect(loaded).not.toBeNull();
    expect(loaded?.id).toBe('session-1');
    expect(loaded?.status).toBe('in-progress');
  });

  it('returns null for an unknown session ID', async () => {
    const result = await storage.load('no-such-session');
    expect(result).toBeNull();
  });

  it('overwrites an existing session on re-save', async () => {
    const state = makeState('session-1');
    await storage.save(state);

    const updated: JourneyState = { ...state, status: 'paused' };
    await storage.save(updated);

    const loaded = await storage.load('session-1');
    expect(loaded?.status).toBe('paused');
  });

  it('removes a session', async () => {
    await storage.save(makeState('session-1'));
    await storage.remove('session-1');
    const loaded = await storage.load('session-1');
    expect(loaded).toBeNull();
  });

  it('lists all saved session IDs', async () => {
    await storage.save(makeState('session-a'));
    await storage.save(makeState('session-b'));
    const sessions = await storage.listSessions();
    expect(sessions).toContain('session-a');
    expect(sessions).toContain('session-b');
  });

  it('removes a session ID from the index on delete', async () => {
    await storage.save(makeState('session-1'));
    await storage.remove('session-1');
    const sessions = await storage.listSessions();
    expect(sessions).not.toContain('session-1');
  });

  it('does not duplicate session IDs in the index when saving twice', async () => {
    const state = makeState('session-1');
    await storage.save(state);
    await storage.save(state);
    const sessions = await storage.listSessions();
    const count = sessions.filter((id) => id === 'session-1').length;
    expect(count).toBe(1);
  });

  it('returns empty array when no sessions exist', async () => {
    const sessions = await storage.listSessions();
    expect(sessions).toEqual([]);
  });
});

describe('defaultStyleFlowStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is an instance of LocalStorageStyleFlowStorage', () => {
    expect(defaultStyleFlowStorage).toBeInstanceOf(LocalStorageStyleFlowStorage);
  });

  it('can save and retrieve state', async () => {
    const state = makeState('default-test');
    await defaultStyleFlowStorage.save(state);
    const loaded = await defaultStyleFlowStorage.load('default-test');
    expect(loaded?.id).toBe('default-test');
    // Clean up
    await defaultStyleFlowStorage.remove('default-test');
  });
});
