/**
 * Tests for checkpoint functionality
 * Phase 3: Checkpoint System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCheckpoints } from './useCheckpoints';
import type { LayoutSpec } from '../layout-schema';

describe('useCheckpoints', () => {
  const mockSpec: LayoutSpec = {
    root: {
      id: 'root',
      type: 'frame',
      children: [],
    },
  };

  const mockSetSpec = vi.fn();
  const mockGetSpec = vi.fn(() => mockSpec);

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with empty checkpoints', async () => {
    const { result } = renderHook(() =>
      useCheckpoints({
        canvasId: 'test-canvas',
        getSpec: mockGetSpec,
        setSpec: mockSetSpec,
        enableAutoCheckpoint: false,
      })
    );

    // Wait for initial load to complete
    await waitFor(() => {
      expect(result.current.checkpoints).toBeDefined();
    }, { timeout: 1000 });
    
    expect(result.current.checkpoints).toEqual([]);
  });

  it('should create a manual checkpoint', async () => {
    const { result } = renderHook(() =>
      useCheckpoints({
        canvasId: 'test-canvas',
        getSpec: mockGetSpec,
        setSpec: mockSetSpec,
        enableAutoCheckpoint: false,
      })
    );

    await act(async () => {
      await result.current.createCheckpoint({ label: 'Test checkpoint', isAuto: false });
    });

    await waitFor(() => {
      expect(result.current.checkpoints.length).toBe(1);
    }, { timeout: 2000 });
    
    expect(result.current.checkpoints[0].label).toBe('Test checkpoint');
    expect(result.current.checkpoints[0].isAuto).toBe(false);
  });

  it('should create an auto checkpoint', async () => {
    const { result } = renderHook(() =>
      useCheckpoints({
        canvasId: 'test-canvas',
        getSpec: mockGetSpec,
        setSpec: mockSetSpec,
        enableAutoCheckpoint: false,
      })
    );

    await act(async () => {
      await result.current.createCheckpoint({ isAuto: true });
    });

    await waitFor(() => {
      expect(result.current.checkpoints.length).toBe(1);
    }, { timeout: 2000 });
    
    expect(result.current.checkpoints[0].isAuto).toBe(true);
  });

  it('should restore from a checkpoint', async () => {
    const restoredSpec: LayoutSpec = {
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'rect-1',
            type: 'rect',
            position: { x: 100, y: 100 },
            size: { width: 200, height: 150 },
          },
        ],
      },
    };

    const { result } = renderHook(() =>
      useCheckpoints({
        canvasId: 'test-canvas',
        getSpec: () => restoredSpec,
        setSpec: mockSetSpec,
        enableAutoCheckpoint: false,
      })
    );

    let checkpointId: string;

    await act(async () => {
      const checkpoint = await result.current.createCheckpoint({ label: 'Before changes' });
      checkpointId = checkpoint!.id;
    });

    await waitFor(() => {
      expect(result.current.checkpoints.length).toBe(1);
    }, { timeout: 2000 });

    await act(async () => {
      await result.current.restoreCheckpoint(checkpointId);
    });

    expect(mockSetSpec).toHaveBeenCalledWith(restoredSpec);
  }, 10000);

  it('should delete a checkpoint', async () => {
    const { result } = renderHook(() =>
      useCheckpoints({
        canvasId: 'test-canvas',
        getSpec: mockGetSpec,
        setSpec: mockSetSpec,
        enableAutoCheckpoint: false,
      })
    );

    let checkpointId: string;

    await act(async () => {
      const checkpoint = await result.current.createCheckpoint({ label: 'To delete' });
      checkpointId = checkpoint!.id;
    });

    await waitFor(() => {
      expect(result.current.checkpoints.length).toBe(1);
    }, { timeout: 2000 });

    await act(async () => {
      await result.current.deleteCheckpoint(checkpointId);
    });

    await waitFor(() => {
      expect(result.current.checkpoints.length).toBe(0);
    }, { timeout: 2000 });
  }, 10000);

  it('should list checkpoints sorted by creation time (newest first)', async () => {
    const { result } = renderHook(() =>
      useCheckpoints({
        canvasId: 'test-canvas',
        getSpec: mockGetSpec,
        setSpec: mockSetSpec,
        enableAutoCheckpoint: false,
      })
    );

    await act(async () => {
      await result.current.createCheckpoint({ label: 'First' });
      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));
      await result.current.createCheckpoint({ label: 'Second' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await result.current.createCheckpoint({ label: 'Third' });
    });

    await waitFor(() => {
      expect(result.current.checkpoints.length).toBe(3);
    }, { timeout: 2000 });
    
    expect(result.current.checkpoints[0].label).toBe('Third');
    expect(result.current.checkpoints[1].label).toBe('Second');
    expect(result.current.checkpoints[2].label).toBe('First');
  }, 10000);

  it('should store checkpoint metadata', async () => {
    const { result } = renderHook(() =>
      useCheckpoints({
        canvasId: 'test-canvas',
        getSpec: mockGetSpec,
        setSpec: mockSetSpec,
        userId: 'user-123',
        enableAutoCheckpoint: false,
      })
    );

    await act(async () => {
      await result.current.createCheckpoint({ label: 'Metadata test' });
    });

    await waitFor(() => {
      expect(result.current.checkpoints.length).toBe(1);
    }, { timeout: 2000 });
    
    const checkpoint = result.current.checkpoints[0];
    expect(checkpoint.userId).toBe('user-123');
    expect(checkpoint.canvasId).toBe('test-canvas');
    expect(checkpoint.sizeBytes).toBeGreaterThan(0);
    expect(checkpoint.createdAt).toBeGreaterThan(0);
  }, 10000);
});
