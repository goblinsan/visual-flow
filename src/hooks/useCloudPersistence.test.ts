/**
 * Tests for useCloudPersistence hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCloudPersistence } from './useCloudPersistence';
import type { LayoutSpec } from '../layout-schema';
import * as apiClientModule from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
  apiClient: {
    getCanvas: vi.fn(),
    createCanvas: vi.fn(),
    updateCanvas: vi.fn(),
    listCanvases: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useCloudPersistence', () => {
  const buildInitial = (): LayoutSpec => ({
    version: '1.0.0',
    root: {
      id: 'root',
      type: 'frame',
      children: [],
    },
  });

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with buildInitial when no data exists', () => {
    const { result } = renderHook(() =>
      useCloudPersistence({ buildInitial })
    );

    expect(result.current.spec).toEqual(buildInitial());
    expect(result.current.canvasId).toBeNull();
  });

  it('should load canvas from cloud when canvasId is provided', async () => {
    const mockCanvas = {
      id: 'canvas-1',
      name: 'Test Canvas',
      spec: buildInitial(),
      owner_id: 'user-1',
      created_at: 123,
      updated_at: 456,
      user_role: 'owner' as const,
    };

    vi.mocked(apiClientModule.apiClient.getCanvas).mockResolvedValueOnce({
      data: mockCanvas,
    });

    const { result } = renderHook(() =>
      useCloudPersistence({
        buildInitial,
        canvasId: 'canvas-1',
      })
    );

    await waitFor(() => {
      expect(result.current.spec).toEqual(mockCanvas.spec);
      expect(result.current.userRole).toBe('owner');
    });
  });

  it('should fallback to localStorage when cloud load fails', async () => {
    const savedSpec = buildInitial();
    localStorageMock.setItem('vf_design_spec', JSON.stringify(savedSpec));

    vi.mocked(apiClientModule.apiClient.getCanvas).mockResolvedValueOnce({
      error: 'Network error',
    });

    const { result } = renderHook(() =>
      useCloudPersistence({
        buildInitial,
        canvasId: 'canvas-1',
      })
    );

    await waitFor(() => {
      expect(result.current.spec).toEqual(savedSpec);
      expect(result.current.lastError).toBe('Network error');
    });
  });

  it('should save to cloud when online and canvasId exists', async () => {
    const mockCanvas = {
      id: 'canvas-1',
      spec: buildInitial(),
      name: 'Test',
      owner_id: 'user-1',
      created_at: 123,
      updated_at: 456,
    };

    vi.mocked(apiClientModule.apiClient.getCanvas).mockResolvedValueOnce({
      data: mockCanvas,
    });

    vi.mocked(apiClientModule.apiClient.updateCanvas).mockResolvedValueOnce({
      data: mockCanvas,
    });

    const { result } = renderHook(() =>
      useCloudPersistence({
        buildInitial,
        canvasId: 'canvas-1',
        debounceMs: 10,
      })
    );

    await waitFor(() => expect(result.current.spec).toBeDefined());

    // Update spec
    const newSpec: LayoutSpec = {
      ...buildInitial(),
      root: { ...buildInitial().root, id: 'new-root' },
    };

    act(() => {
      result.current.setSpec(newSpec);
    });

    // Wait for debounced save
    await waitFor(
      () => {
        expect(apiClientModule.apiClient.updateCanvas).toHaveBeenCalledWith(
          'canvas-1',
          expect.objectContaining({ spec: newSpec })
        );
      },
      { timeout: 100 }
    );
  });

  it('should save to localStorage when offline', async () => {
    // Set offline
    Object.defineProperty(navigator, 'onLine', { value: false });

    const { result } = renderHook(() =>
      useCloudPersistence({
        buildInitial,
        debounceMs: 10,
      })
    );

    const newSpec: LayoutSpec = {
      ...buildInitial(),
      root: { ...buildInitial().root, id: 'offline-root' },
    };

    act(() => {
      result.current.setSpec(newSpec);
    });

    // Wait for debounced save
    await waitFor(
      () => {
        const saved = localStorageMock.getItem('vf_design_spec');
        expect(saved).toBeTruthy();
        if (saved) {
          expect(JSON.parse(saved)).toEqual(newSpec);
        }
      },
      { timeout: 100 }
    );

    expect(apiClientModule.apiClient.createCanvas).not.toHaveBeenCalled();
  });

  it('should create new canvas when no canvasId', async () => {
    const mockCanvas = {
      id: 'new-canvas',
      name: 'New Canvas',
      spec: buildInitial(),
      owner_id: 'user-1',
      created_at: 123,
      updated_at: 123,
    };

    vi.mocked(apiClientModule.apiClient.createCanvas).mockResolvedValueOnce({
      data: mockCanvas,
    });

    const { result } = renderHook(() =>
      useCloudPersistence({
        buildInitial,
        canvasName: 'New Canvas',
        debounceMs: 10,
      })
    );

    const newSpec: LayoutSpec = {
      ...buildInitial(),
      root: { ...buildInitial().root, id: 'modified-root' },
    };

    act(() => {
      result.current.setSpec(newSpec);
    });

    // Wait for debounced save
    await waitFor(
      () => {
        expect(apiClientModule.apiClient.createCanvas).toHaveBeenCalledWith(
          'New Canvas',
          newSpec
        );
      },
      { timeout: 100 }
    );

    await waitFor(() => {
      expect(result.current.canvasId).toBe('new-canvas');
      expect(result.current.userRole).toBe('owner');
    });
  });

  it('should handle reset correctly', () => {
    const { result } = renderHook(() =>
      useCloudPersistence({ buildInitial })
    );

    const modifiedSpec: LayoutSpec = {
      ...buildInitial(),
      root: { ...buildInitial().root, id: 'modified' },
    };

    act(() => {
      result.current.setSpec(modifiedSpec);
    });

    expect(result.current.spec.root.id).toBe('modified');

    act(() => {
      result.current.reset();
    });

    expect(result.current.spec).toEqual(buildInitial());
    expect(result.current.canvasId).toBeNull();
  });

  it('should track online/offline status', async () => {
    const { result } = renderHook(() =>
      useCloudPersistence({ buildInitial })
    );

    expect(result.current.isOnline).toBe(true);

    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', { value: false });
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
    });

    // Simulate going online
    Object.defineProperty(navigator, 'onLine', { value: true });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
    });
  });
});
