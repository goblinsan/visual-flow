import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  loadRectDefaults, 
  saveRectDefaults, 
  loadRecentColors, 
  saveRecentColors, 
  loadDesignSpec,
  saveDesignSpec,
  getSavedDesigns,
  saveNamedDesign,
  deleteNamedDesign,
  LS_KEYS,
  getSavedPalettes,
  userOwnsSavedPalette,
  saveUserPalette,
} from './persistence';
import type { DesignTheme } from '../theme/types';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
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

describe('persistence.design spec', () => {
  it('loadDesignSpec returns null when nothing stored', () => {
    expect(loadDesignSpec()).toBeNull();
  });

  it('round-trips design spec', () => {
    const spec = { root: { id: 'r1', type: 'frame', size: { width: 100, height: 100 }, children: [] } };
    saveDesignSpec(spec);
    expect(loadDesignSpec()).toEqual(spec);
  });

  it('loadDesignSpec handles corrupt data gracefully', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(LS_KEYS.designSpec, '{invalid json');
    expect(loadDesignSpec()).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load design spec'),
      expect.any(Error)
    );
    consoleWarnSpy.mockRestore();
  });
});

describe('persistence.saved designs', () => {
  it('getSavedDesigns returns empty array when nothing stored', () => {
    expect(getSavedDesigns()).toEqual([]);
  });

  it('saveNamedDesign creates new design', () => {
    const spec = { root: { id: 'r1', type: 'frame', size: { width: 100, height: 100 }, children: [] } };
    saveNamedDesign('Test Design', spec);
    
    const designs = getSavedDesigns();
    expect(designs).toHaveLength(1);
    expect(designs[0].name).toBe('Test Design');
    expect(designs[0].spec).toEqual(spec);
  });

  it('saveNamedDesign updates existing design', () => {
    const spec1 = { root: { id: 'r1', type: 'frame', size: { width: 100, height: 100 }, children: [] } };
    const spec2 = { root: { id: 'r2', type: 'frame', size: { width: 200, height: 200 }, children: [] } };
    
    saveNamedDesign('Test', spec1);
    saveNamedDesign('Test', spec2);
    
    const designs = getSavedDesigns();
    expect(designs).toHaveLength(1);
    expect(designs[0].spec).toEqual(spec2);
  });

  it('deleteNamedDesign removes design', () => {
    const spec = { root: { id: 'r1', type: 'frame', size: { width: 100, height: 100 }, children: [] } };
    saveNamedDesign('Test', spec);
    expect(getSavedDesigns()).toHaveLength(1);
    
    deleteNamedDesign('Test');
    expect(getSavedDesigns()).toHaveLength(0);
  });

  it('getSavedDesigns handles corrupt data gracefully', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(LS_KEYS.savedDesigns, '{invalid');
    expect(getSavedDesigns()).toEqual([]);
    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Saved Palettes (per-user)
// ---------------------------------------------------------------------------

const makeTheme = (overrides: Partial<DesignTheme> = {}): DesignTheme => ({
  id: 'theme-1',
  name: 'My Theme',
  kulrsPaletteId: 'kulrs-123',
  paletteColors: ['#ff0000', '#00ff00'],
  mode: 'light',
  colors: {} as DesignTheme['colors'],
  typography: { headingFont: 'Inter', bodyFont: 'Roboto' },
  ...overrides,
});

describe('getSavedPalettes', () => {
  it('returns empty array when nothing stored', () => {
    expect(getSavedPalettes('user-1')).toEqual([]);
  });

  it('returns empty array for corrupt data', () => {
    localStorage.setItem('vizail_saved_palettes_user-1', '{invalid');
    expect(getSavedPalettes('user-1')).toEqual([]);
  });

  it('is isolated per user', () => {
    const theme = makeTheme();
    saveUserPalette('user-1', theme, 'new');
    expect(getSavedPalettes('user-2')).toEqual([]);
  });
});

describe('userOwnsSavedPalette', () => {
  it('returns false when user has no saved palettes', () => {
    expect(userOwnsSavedPalette('user-1', makeTheme())).toBe(false);
  });

  it('returns true when user saved a palette with the same id', () => {
    const theme = makeTheme({ id: 'theme-abc' });
    saveUserPalette('user-1', theme, 'new');
    expect(userOwnsSavedPalette('user-1', makeTheme({ id: 'theme-abc' }))).toBe(true);
  });

  it('returns true when user saved a palette with the same kulrsPaletteId', () => {
    const theme = makeTheme({ kulrsPaletteId: 'kulrs-xyz' });
    saveUserPalette('user-1', theme, 'new');
    expect(userOwnsSavedPalette('user-1', makeTheme({ kulrsPaletteId: 'kulrs-xyz' }))).toBe(true);
  });

  it('returns false for a different user', () => {
    const theme = makeTheme({ id: 'theme-abc' });
    saveUserPalette('user-1', theme, 'new');
    expect(userOwnsSavedPalette('user-2', makeTheme({ id: 'theme-abc' }))).toBe(false);
  });
});

describe('saveUserPalette', () => {
  it('adds a new entry in "new" mode', () => {
    const theme = makeTheme();
    saveUserPalette('user-1', theme, 'new');
    const list = getSavedPalettes('user-1');
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('My Theme');
  });

  it('appends multiple entries in "new" mode', () => {
    saveUserPalette('user-1', makeTheme({ id: 't1', name: 'Alpha' }), 'new');
    saveUserPalette('user-1', makeTheme({ id: 't2', name: 'Beta' }), 'new');
    expect(getSavedPalettes('user-1')).toHaveLength(2);
  });

  it('overwrites existing entry in "overwrite" mode by id', () => {
    const theme = makeTheme({ id: 'theme-1', name: 'Old Name' });
    saveUserPalette('user-1', theme, 'new');
    saveUserPalette('user-1', makeTheme({ id: 'theme-1', name: 'New Name' }), 'overwrite');
    const list = getSavedPalettes('user-1');
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('New Name');
  });

  it('overwrites existing entry in "overwrite" mode by kulrsPaletteId', () => {
    const theme = makeTheme({ id: 't1', kulrsPaletteId: 'kulrs-abc', name: 'Old' });
    saveUserPalette('user-1', theme, 'new');
    const updated = makeTheme({ id: 't2', kulrsPaletteId: 'kulrs-abc', name: 'Updated' });
    saveUserPalette('user-1', updated, 'overwrite');
    const list = getSavedPalettes('user-1');
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Updated');
  });

  it('in "overwrite" mode still appends if no existing match', () => {
    saveUserPalette('user-1', makeTheme({ id: 'new-theme', kulrsPaletteId: 'new-pid' }), 'overwrite');
    expect(getSavedPalettes('user-1')).toHaveLength(1);
  });

  it('returns saved entry with original id in "overwrite" mode', () => {
    const theme = makeTheme({ id: 'theme-orig' });
    const result = saveUserPalette('user-1', theme, 'overwrite');
    expect(result.id).toBe('theme-orig');
  });

  it('returns saved entry with modified id in "new" mode', () => {
    const theme = makeTheme({ id: 'theme-orig' });
    const result = saveUserPalette('user-1', theme, 'new');
    // The stored id should be prefixed (not the raw theme id)
    expect(result.id).toContain('theme-orig');
    expect(result.id).not.toBe('theme-orig');
  });
});

