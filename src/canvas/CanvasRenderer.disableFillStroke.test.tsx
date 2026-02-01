import { describe, it, expect } from 'vitest';
import { renderNode } from './CanvasRenderer';
import type { RectNode } from '../layout-schema';

// Helper: mount a single rect via a faux frame root if needed (direct renderNode returns Group wrapper)

describe('CanvasRenderer rect fill/stroke disabling', () => {
  function mkRect(partial: Partial<RectNode>): RectNode {
    return {
      id: 'r1',
      type: 'rect',
      position: { x: 0, y: 0 },
      size: { width: 40, height: 30 },
      ...partial,
    } as RectNode;
  }

  it('renders with fill and stroke when provided (props intact)', () => {
    const node = mkRect({ fill: '#123456', stroke: '#654321', strokeWidth: 2 });
    const tree = renderNode(node) as any;
    const child = Array.isArray(tree.props.children) ? tree.props.children[0] : tree.props.children;
    expect(child.props.fill).toBe('#123456');
    expect(child.props.stroke).toBe('#654321');
    expect(child.props.strokeEnabled).toBe(true);
  });

  it('disables fill when fill undefined', () => {
    const node = mkRect({ fill: undefined, stroke: '#222', strokeWidth: 1 });
    const tree = renderNode(node) as any;
    // Dive into props: Group -> Rect child is at tree.props.children.props.children (Group>Rect)
    const groupChildren = tree.props.children;
    const rectEl = Array.isArray(groupChildren) ? groupChildren[0] : groupChildren;
    expect(rectEl.props.fillEnabled).toBe(false);
    expect(rectEl.props.fill).toBeUndefined();
    expect(rectEl.props.stroke).toBe('#222');
  });

  it('disables stroke when stroke undefined', () => {
    const node = mkRect({ fill: '#333', stroke: undefined });
    const tree = renderNode(node) as any;
    const groupChildren = tree.props.children;
    const rectEl = Array.isArray(groupChildren) ? groupChildren[0] : groupChildren;
    expect(rectEl.props.strokeEnabled).toBe(false);
    expect(rectEl.props.strokeWidth).toBe(0);
    expect(rectEl.props.fill).toBe('#333');
  });

  it('draws faint outline when both disabled', () => {
    const node = mkRect({ fill: undefined, stroke: undefined });
    const tree = renderNode(node) as any;
    const groupChildren = tree.props.children;
    const rectEl = Array.isArray(groupChildren) ? groupChildren[0] : groupChildren;
    expect(rectEl.props.fillEnabled).toBe(false);
    // Fallback outline should be enabled with low opacity and dashed
    expect(rectEl.props.strokeEnabled).toBe(true);
    expect(rectEl.props.stroke).toBe('#94a3b8');
    expect(rectEl.props.opacity).toBe(0.4);
    expect(rectEl.props.dash).toEqual([3,3]);
  });
});
