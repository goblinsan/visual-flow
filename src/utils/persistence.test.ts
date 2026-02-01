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
  LS_KEYS 
} from './persistence';

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

