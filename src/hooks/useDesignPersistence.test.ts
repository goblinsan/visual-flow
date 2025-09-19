import { describe, it, expect, beforeEach } from 'vitest';
import { useDesignPersistence } from './useDesignPersistence';
import { renderHook, act } from '@testing-library/react';
import type { LayoutSpec } from '../layout-schema';

// Minimal spec shape for test with correct literal types
const buildInitial = (): LayoutSpec => ({ root: { id: 'root', type: 'frame', size: { width: 100, height: 80 }, background: '#fff', children: [] } });

describe('useDesignPersistence', () => {
  beforeEach(() => { localStorage.clear(); });

  it('loads initial when nothing persisted', () => {
    const { result } = renderHook(() => useDesignPersistence({ buildInitial }));
    expect(result.current.spec.root.size.width).toBe(100);
    expect(result.current.hasPersisted).toBe(false);
  });

  it('persists changes (microtask)', async () => {
    const { result } = renderHook(() => useDesignPersistence({ buildInitial }));
    act(() => {
      result.current.setSpec(prev => ({ ...prev, root: { ...prev.root, size: { width: 200, height: 160 }, children: [] } }));
    });
    // Allow microtask
    await new Promise(r => setTimeout(r, 5));
    const raw = localStorage.getItem('vf_design_spec');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.root.size.width).toBe(200);
  });

  it('resets to buildInitial when reset called', async () => {
    const { result } = renderHook(() => useDesignPersistence({ buildInitial }));
    act(() => {
      result.current.setSpec(prev => ({ ...prev, root: { ...prev.root, size: { width: 250, height: 100 }, children: [] } }));
    });
    await new Promise(r => setTimeout(r, 5));
    act(() => { result.current.reset(); });
    expect(result.current.spec.root.size.width).toBe(100);
  });
});
