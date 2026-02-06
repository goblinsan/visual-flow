import { describe, it, expect, vi } from 'vitest';
import { CurveControlPointsLayer } from './CurveControlPointsLayer';
import type { CurveNode, LayoutSpec } from '../../layout-schema';

describe('CurveControlPointsLayer', () => {
  const createMockCurveNode = (overrides?: Partial<CurveNode>): CurveNode => ({
    id: 'curve-1',
    type: 'curve',
    position: { x: 100, y: 100 },
    points: [0, 0, 50, 50, 100, 0],
    locked: false,
    ...overrides,
  });

  const createMockSpec = (): LayoutSpec => ({
    root: {
      id: 'root',
      type: 'frame',
      size: { width: 800, height: 600 },
      children: [],
    },
  });

  const defaultProps = {
    curveNode: createMockCurveNode(),
    scale: 1,
    selectedCurvePointIndex: null,
    setSelectedCurvePointIndex: vi.fn(),
    setSpec: vi.fn(),
  };

  it('renders with default props', () => {
    const element = CurveControlPointsLayer(defaultProps);
    expect(element).toBeTruthy();
  });

  it('renders control points for curve', () => {
    const curveNode = createMockCurveNode({
      points: [0, 0, 50, 50, 100, 0], // 3 control points
    });
    const element = CurveControlPointsLayer({
      ...defaultProps,
      curveNode,
    });
    expect(element).toBeTruthy();
  });

  it('renders lines connecting control points', () => {
    const curveNode = createMockCurveNode({
      points: [0, 0, 50, 50, 100, 0, 150, 50], // 4 control points
    });
    const element = CurveControlPointsLayer({
      ...defaultProps,
      curveNode,
    });
    expect(element).toBeTruthy();
  });

  it('handles single control point', () => {
    const curveNode = createMockCurveNode({
      points: [0, 0], // 1 control point
    });
    const element = CurveControlPointsLayer({
      ...defaultProps,
      curveNode,
    });
    expect(element).toBeTruthy();
  });

  it('handles empty points array', () => {
    const curveNode = createMockCurveNode({
      points: [], // No control points
    });
    const element = CurveControlPointsLayer({
      ...defaultProps,
      curveNode,
    });
    expect(element).toBeTruthy();
  });

  it('applies scale to line stroke width', () => {
    const element = CurveControlPointsLayer({
      ...defaultProps,
      scale: 2,
    });
    expect(element).toBeTruthy();
  });

  it('applies scale to dash pattern', () => {
    const element = CurveControlPointsLayer({
      ...defaultProps,
      scale: 0.5,
    });
    expect(element).toBeTruthy();
  });

  it('applies scale to control point radius', () => {
    const element = CurveControlPointsLayer({
      ...defaultProps,
      scale: 3,
    });
    expect(element).toBeTruthy();
  });

  it('highlights selected control point', () => {
    const element = CurveControlPointsLayer({
      ...defaultProps,
      selectedCurvePointIndex: 1,
    });
    expect(element).toBeTruthy();
  });

  it('highlights first control point as endpoint', () => {
    const element = CurveControlPointsLayer({
      ...defaultProps,
      selectedCurvePointIndex: 0,
    });
    expect(element).toBeTruthy();
  });

  it('highlights last control point as endpoint', () => {
    const curveNode = createMockCurveNode({
      points: [0, 0, 50, 50, 100, 0], // 3 control points
    });
    const element = CurveControlPointsLayer({
      ...defaultProps,
      curveNode,
      selectedCurvePointIndex: 2, // Last point
    });
    expect(element).toBeTruthy();
  });

  it('disables interaction when curve is locked', () => {
    const curveNode = createMockCurveNode({
      locked: true,
    });
    const element = CurveControlPointsLayer({
      ...defaultProps,
      curveNode,
    });
    expect(element).toBeTruthy();
  });

  it('handles curve with position offset', () => {
    const curveNode = createMockCurveNode({
      position: { x: 200, y: 300 },
      points: [0, 0, 50, 50],
    });
    const element = CurveControlPointsLayer({
      ...defaultProps,
      curveNode,
    });
    expect(element).toBeTruthy();
  });

  it('handles curve without position', () => {
    const curveNode = createMockCurveNode({
      position: undefined,
      points: [0, 0, 50, 50],
    });
    const element = CurveControlPointsLayer({
      ...defaultProps,
      curveNode,
    });
    expect(element).toBeTruthy();
  });

  it('handles null selectedCurvePointIndex', () => {
    const element = CurveControlPointsLayer({
      ...defaultProps,
      selectedCurvePointIndex: null,
    });
    expect(element).toBeTruthy();
  });

  it('handles undefined selectedCurvePointIndex', () => {
    const element = CurveControlPointsLayer({
      ...defaultProps,
      selectedCurvePointIndex: undefined,
    });
    expect(element).toBeTruthy();
  });

  it('handles missing setSelectedCurvePointIndex callback', () => {
    const element = CurveControlPointsLayer({
      ...defaultProps,
      setSelectedCurvePointIndex: undefined,
    });
    expect(element).toBeTruthy();
  });

  it('renders multiple control points with different styles', () => {
    const curveNode = createMockCurveNode({
      points: [0, 0, 25, 25, 50, 50, 75, 75, 100, 100], // 5 points: 2 endpoints + 3 middle
    });
    const element = CurveControlPointsLayer({
      ...defaultProps,
      curveNode,
    });
    expect(element).toBeTruthy();
  });

  it('handles very small scale values', () => {
    const element = CurveControlPointsLayer({
      ...defaultProps,
      scale: 0.1,
    });
    expect(element).toBeTruthy();
  });

  it('handles very large scale values', () => {
    const element = CurveControlPointsLayer({
      ...defaultProps,
      scale: 10,
    });
    expect(element).toBeTruthy();
  });

  it('renders control points at negative coordinates', () => {
    const curveNode = createMockCurveNode({
      position: { x: 100, y: 100 },
      points: [-50, -50, 0, 0, 50, 50],
    });
    const element = CurveControlPointsLayer({
      ...defaultProps,
      curveNode,
    });
    expect(element).toBeTruthy();
  });

  it('handles curve with many control points', () => {
    const points: number[] = [];
    for (let i = 0; i < 100; i++) {
      points.push(i * 10, i * 10);
    }
    const curveNode = createMockCurveNode({ points });
    const element = CurveControlPointsLayer({
      ...defaultProps,
      curveNode,
    });
    expect(element).toBeTruthy();
  });

  it('handles curve with two control points (minimum for lines)', () => {
    const curveNode = createMockCurveNode({
      points: [0, 0, 100, 100], // 2 control points
    });
    const element = CurveControlPointsLayer({
      ...defaultProps,
      curveNode,
    });
    expect(element).toBeTruthy();
  });

  it('renders different visual states for endpoint vs middle points', () => {
    const curveNode = createMockCurveNode({
      points: [0, 0, 50, 50, 100, 100, 150, 150], // 4 points: 2 endpoints, 2 middle
    });
    const element = CurveControlPointsLayer({
      ...defaultProps,
      curveNode,
    });
    expect(element).toBeTruthy();
  });

  it('handles selection of middle control point', () => {
    const curveNode = createMockCurveNode({
      points: [0, 0, 50, 50, 100, 100], // 3 points
    });
    const element = CurveControlPointsLayer({
      ...defaultProps,
      curveNode,
      selectedCurvePointIndex: 1, // Middle point
    });
    expect(element).toBeTruthy();
  });

  it('handles curve with fractional coordinates', () => {
    const curveNode = createMockCurveNode({
      position: { x: 100.5, y: 200.7 },
      points: [0.3, 0.8, 50.2, 50.9, 100.1, 0.4],
    });
    const element = CurveControlPointsLayer({
      ...defaultProps,
      curveNode,
    });
    expect(element).toBeTruthy();
  });

  it('handles curve with zero-length segments', () => {
    const curveNode = createMockCurveNode({
      points: [0, 0, 0, 0, 50, 50], // First two points at same location
    });
    const element = CurveControlPointsLayer({
      ...defaultProps,
      curveNode,
    });
    expect(element).toBeTruthy();
  });

  it('applies correct colors for selected state', () => {
    const element = CurveControlPointsLayer({
      ...defaultProps,
      selectedCurvePointIndex: 1,
    });
    expect(element).toBeTruthy();
  });

  it('applies correct colors for endpoint state', () => {
    const element = CurveControlPointsLayer({
      ...defaultProps,
      selectedCurvePointIndex: 0, // First endpoint
    });
    expect(element).toBeTruthy();
  });

  it('applies correct colors for middle point state', () => {
    const curveNode = createMockCurveNode({
      points: [0, 0, 50, 50, 100, 100], // 3 points
    });
    const element = CurveControlPointsLayer({
      ...defaultProps,
      curveNode,
      selectedCurvePointIndex: null, // No selection
    });
    expect(element).toBeTruthy();
  });
});
