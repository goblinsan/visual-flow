import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderNode } from './CanvasRenderer';
import type { RectNode } from '../layout-schema';

function mkRect(partial: Partial<RectNode>): RectNode {
  return {
    id: 'rect_x',
    type: 'rect',
    position: { x: 10, y: 20 },
    size: { width: 120, height: 80 },
    stroke: '#334155',
    strokeWidth: 4,
    ...partial,
  } as RectNode;
}

// Pure renderNode structural test (doesn't mount to real canvas). We inspect the React element tree.
// Purpose: ensure strokeScaleEnabled is hard-disabled so visual stroke width stays constant during scaling gestures.

describe('CanvasRenderer strokeScaleEnabled prop', () => {
  it('sets strokeScaleEnabled=false on Rect for constant visual stroke width', () => {
    const node = mkRect({});
    const element: any = renderNode(node);
    // element is a Group wrapper; its child is the actual <Rect />
    const groupChildren = element.props.children;
    const rectEl = Array.isArray(groupChildren) ? groupChildren[0] : groupChildren;
  // Instead of asserting on constructor name (can be undefined in test env), ensure expected prop is present.
  expect(rectEl && typeof rectEl).toBeTruthy();
  expect(rectEl.props.strokeScaleEnabled).toBe(false);
  });
});
