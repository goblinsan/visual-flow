/**
 * Tests for conflict detection
 * Phase 3: Conflict Notifications
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useConflictDetection } from './useConflictDetection';
import type { LayoutSpec } from '../layout-schema';
import type { UserAwareness } from '../collaboration/types';

describe('useConflictDetection', () => {
  const baseSpec: LayoutSpec = {
    root: {
      id: 'root',
      type: 'frame',
      children: [
        {
          id: 'rect-1',
          type: 'rect',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 150 },
          fill: '#ff0000',
        },
      ],
    },
  };

  const collaborators = new Map<number, UserAwareness>([
    [
      123,
      {
        clientId: 123,
        userId: 'user-2',
        displayName: 'Alice',
        color: '#3b82f6',
        selection: ['rect-1'],
      },
    ],
  ]);

  beforeEach(() => {
    // Reset any state between tests
  });

  it('should not detect conflicts when spec does not change', () => {
    const { result, rerender } = renderHook(
      ({ spec }) =>
        useConflictDetection({
          spec,
          selectedNodeIds: ['rect-1'],
          collaborators,
          clientId: 456,
          enabled: true,
        }),
      { initialProps: { spec: baseSpec } }
    );

    expect(result.current.conflicts).toEqual([]);

    rerender({ spec: baseSpec });
    expect(result.current.conflicts).toEqual([]);
  });

  it('should detect conflicts when selected node is modified', () => {
    const { result, rerender } = renderHook(
      ({ spec }) =>
        useConflictDetection({
          spec,
          selectedNodeIds: ['rect-1'],
          collaborators,
          clientId: 456,
          enabled: true,
        }),
      { initialProps: { spec: baseSpec } }
    );

    expect(result.current.conflicts).toEqual([]);

    // Modify the selected node
    const modifiedSpec: LayoutSpec = {
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'rect-1',
            type: 'rect',
            position: { x: 100, y: 100 },
            size: { width: 200, height: 150 },
            fill: '#00ff00', // Changed color
          },
        ],
      },
    };

    rerender({ spec: modifiedSpec });

    // Should detect a conflict
    expect(result.current.conflicts.length).toBeGreaterThan(0);
    expect(result.current.conflicts[0].affectedNodeIds).toContain('rect-1');
  });

  it('should not detect conflicts for non-selected nodes', () => {
    const { result, rerender } = renderHook(
      ({ spec }) =>
        useConflictDetection({
          spec,
          selectedNodeIds: [], // No selection
          collaborators,
          clientId: 456,
          enabled: true,
        }),
      { initialProps: { spec: baseSpec } }
    );

    const modifiedSpec: LayoutSpec = {
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'rect-1',
            type: 'rect',
            position: { x: 200, y: 200 }, // Changed position
            size: { width: 200, height: 150 },
            fill: '#ff0000',
          },
        ],
      },
    };

    rerender({ spec: modifiedSpec });

    // Should not detect conflicts since nothing is selected
    expect(result.current.conflicts).toEqual([]);
  });

  it('should identify the likely modifier from collaborators', () => {
    const { result, rerender } = renderHook(
      ({ spec }) =>
        useConflictDetection({
          spec,
          selectedNodeIds: ['rect-1'],
          collaborators,
          clientId: 456,
          enabled: true,
        }),
      { initialProps: { spec: baseSpec } }
    );

    const modifiedSpec: LayoutSpec = {
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'rect-1',
            type: 'rect',
            position: { x: 150, y: 150 },
            size: { width: 200, height: 150 },
            fill: '#ff0000',
          },
        ],
      },
    };

    rerender({ spec: modifiedSpec });

    expect(result.current.conflicts.length).toBeGreaterThan(0);
    expect(result.current.conflicts[0].userName).toBe('Alice');
    expect(result.current.conflicts[0].userColor).toBe('#3b82f6');
  });

  it('should allow dismissing conflicts', () => {
    const { result, rerender } = renderHook(
      ({ spec }) =>
        useConflictDetection({
          spec,
          selectedNodeIds: ['rect-1'],
          collaborators,
          clientId: 456,
          enabled: true,
        }),
      { initialProps: { spec: baseSpec } }
    );

    const modifiedSpec: LayoutSpec = {
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'rect-1',
            type: 'rect',
            position: { x: 150, y: 150 },
            size: { width: 200, height: 150 },
            fill: '#ff0000',
          },
        ],
      },
    };

    rerender({ spec: modifiedSpec });

    expect(result.current.conflicts.length).toBeGreaterThan(0);
    const conflictId = result.current.conflicts[0].id;

    result.current.dismissConflict(conflictId);

    expect(result.current.conflicts.length).toBe(0);
  });

  it('should respect enabled flag', () => {
    const { result, rerender } = renderHook(
      ({ spec, enabled }) =>
        useConflictDetection({
          spec,
          selectedNodeIds: ['rect-1'],
          collaborators,
          clientId: 456,
          enabled,
        }),
      { initialProps: { spec: baseSpec, enabled: false } }
    );

    const modifiedSpec: LayoutSpec = {
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'rect-1',
            type: 'rect',
            position: { x: 150, y: 150 },
            size: { width: 200, height: 150 },
            fill: '#ff0000',
          },
        ],
      },
    };

    rerender({ spec: modifiedSpec, enabled: false });

    // Should not detect conflicts when disabled
    expect(result.current.conflicts).toEqual([]);
  });
});
