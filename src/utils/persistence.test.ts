import { describe, it, expect, beforeEach } from 'vitest';
import { loadRectDefaults, saveRectDefaults, loadRecentColors, saveRecentColors, LS_KEYS } from './persistence';

beforeEach(() => {
  localStorage.clear();
});

describe('persistence.load/saveRectDefaults', () => {
  it('returns null when nothing stored', () => {
    expect(loadRectDefaults()).toBeNull();
  });

  it('round-trips typical defaults', () => {
    saveRectDefaults({ fill: '#ffffff', stroke: '#222222', strokeWidth: 2, radius: 4, opacity: 0.5, strokeDash: [4,2] });
    const loaded = loadRectDefaults();
    expect(loaded).toEqual({ fill: '#ffffff', stroke: '#222222', strokeWidth: 2, radius: 4, opacity: 0.5, strokeDash: [4,2] });
  });

  it('ignores invalid JSON gracefully', () => {
    localStorage.setItem(LS_KEYS.rectDefaults, '{invalid');
    expect(loadRectDefaults()).toBeNull();
  });
});

describe('persistence.load/saveRecentColors', () => {
  it('returns null when nothing stored', () => {
    expect(loadRecentColors()).toBeNull();
  });

  it('round-trips array', () => {
    saveRecentColors(['#ffffff', '#000000']);
    expect(loadRecentColors()).toEqual(['#ffffff', '#000000']);
  });

  it('filters non-strings', () => {
    localStorage.setItem(LS_KEYS.recentColors, JSON.stringify(['#fff', 42, null, '#000']));
    expect(loadRecentColors()).toEqual(['#fff', '#000']);
  });
});
