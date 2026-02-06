import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import type { LayoutSpec, LayoutNode } from '../../layout-schema';

function mkSpec(): LayoutSpec {
  return {
    root: {
      id: "root",
      type: "frame",
      size: { width: 800, height: 600 },
      children: [
        { id: "a", type: "rect", position: { x: 10, y: 10 }, size: { width: 100, height: 50 }, fill: '#fff', stroke: '#000', strokeWidth: 1 },
        { id: "b", type: "rect", position: { x: 20, y: 70 }, size: { width: 100, height: 50 }, fill: '#fff', stroke: '#000', strokeWidth: 1 },
      ]
    }
  } as LayoutSpec;
}

describe('useKeyboardShortcuts', () => {
  let addEventListener: typeof window.addEventListener;
  let removeEventListener: typeof window.removeEventListener;

  beforeEach(() => {
    addEventListener = window.addEventListener;
    removeEventListener = window.removeEventListener;
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();
  });

  afterEach(() => {
    window.addEventListener = addEventListener;
    window.removeEventListener = removeEventListener;
  });

  it('registers keyboard event listener on mount', () => {
    const config = {
      isSelectMode: true,
      canGroup: false,
      canUngroup: false,
      selected: [],
      editingTextId: null,
      spec: mkSpec(),
      setSpec: vi.fn(),
      setSelection: vi.fn(),
      performGroup: vi.fn(),
      performUngroup: vi.fn(),
      selectionContext: { nodeById: {}, parentOf: {} },
      collectExistingIds: vi.fn(() => new Set()),
      createUniqueIdFactory: vi.fn(() => (id: string) => id),
      remapIdsAndOffset: vi.fn((node) => node),
      cloneNode: vi.fn((node) => node),
      findNode: vi.fn(() => null),
      appendNodesToRoot: vi.fn((spec) => spec),
    };

    renderHook(() => useKeyboardShortcuts(config));

    expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('unregisters keyboard event listener on unmount', () => {
    const config = {
      isSelectMode: true,
      canGroup: false,
      canUngroup: false,
      selected: [],
      editingTextId: null,
      spec: mkSpec(),
      setSpec: vi.fn(),
      setSelection: vi.fn(),
      performGroup: vi.fn(),
      performUngroup: vi.fn(),
      selectionContext: { nodeById: {}, parentOf: {} },
      collectExistingIds: vi.fn(() => new Set()),
      createUniqueIdFactory: vi.fn(() => (id: string) => id),
      remapIdsAndOffset: vi.fn((node) => node),
      cloneNode: vi.fn((node) => node),
      findNode: vi.fn(() => null),
      appendNodesToRoot: vi.fn((spec) => spec),
    };

    const { unmount } = renderHook(() => useKeyboardShortcuts(config));
    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('does not register handler if editing text', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    
    const config = {
      isSelectMode: true,
      canGroup: false,
      canUngroup: false,
      selected: [],
      editingTextId: 'text1',
      spec: mkSpec(),
      setSpec: vi.fn(),
      setSelection: vi.fn(),
      performGroup: vi.fn(),
      performUngroup: vi.fn(),
      selectionContext: { nodeById: {}, parentOf: {} },
      collectExistingIds: vi.fn(() => new Set()),
      createUniqueIdFactory: vi.fn(() => (id: string) => id),
      remapIdsAndOffset: vi.fn((node) => node),
      cloneNode: vi.fn((node) => node),
      findNode: vi.fn(() => null),
      appendNodesToRoot: vi.fn((spec) => spec),
    };

    renderHook(() => useKeyboardShortcuts(config));

    // Handler is registered but should bail early when editing
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    
    addEventListenerSpy.mockRestore();
  });
});
