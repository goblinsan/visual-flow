import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttributesSidebar } from './AttributesSidebar';
import type { LayoutSpec } from '../../layout-schema';

describe('AttributesSidebar', () => {
  const mockSpec: LayoutSpec = {
    root: {
      id: 'root',
      type: 'frame',
      size: { width: 800, height: 600 },
      children: [
        {
          id: 'rect1',
          type: 'rect',
          position: { x: 10, y: 10 },
          size: { width: 100, height: 100 },
          fill: '#ff0000',
        },
      ],
    },
  };

  const defaultProps = {
    spec: mockSpec,
    setSpec: vi.fn(),
    selectedIds: [],
    tool: 'select',
    editingCurveId: null,
    setEditingCurveId: vi.fn(),
    selectedCurvePointIndex: null,
    setSelectedCurvePointIndex: vi.fn(),
    attributeTab: 'element' as const,
    setAttributeTab: vi.fn(),
    draggingGroupIndex: null,
    setDraggingGroupIndex: vi.fn(),
    dragOverGroupIndex: null,
    setDragOverGroupIndex: vi.fn(),
    lastFillById: {},
    setLastFillById: vi.fn(),
    lastStrokeById: {},
    setLastStrokeById: vi.fn(),
    rawDashInput: {},
    setRawDashInput: vi.fn(),
    beginRecentSession: vi.fn(),
    previewRecent: vi.fn(),
    commitRecent: vi.fn(),
    pushRecent: vi.fn(),
    recentColors: [],
    rectDefaults: {
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 1,
      radius: 0,
      opacity: 1,
    },
    updateRectDefaults: vi.fn(),
    activeFlowId: null,
    setActiveFlowId: vi.fn(),
    updateFlows: vi.fn(),
    focusScreen: vi.fn(),
    playTransitionPreview: vi.fn(),
    setSelection: vi.fn(),
    isCollaborative: false,
    updateSelection: vi.fn(),
    blockCanvasClicksRef: { current: false },
    skipNormalizationRef: { current: false },
  };

  it('should render context info when no selection', () => {
    render(<AttributesSidebar {...defaultProps} />);
    expect(screen.getByText('Context')).toBeInTheDocument();
    expect(screen.getByText('No selection')).toBeInTheDocument();
  });

  it('should show rect defaults panel when tool is rect and no selection', () => {
    render(<AttributesSidebar {...defaultProps} tool="rect" />);
    expect(screen.getByText('Context')).toBeInTheDocument();
    // DefaultsPanel should be rendered
    expect(screen.queryByText('No selection')).not.toBeInTheDocument();
  });

  it('should show node info when single node is selected', () => {
    render(<AttributesSidebar {...defaultProps} selectedIds={['rect1']} />);
    expect(screen.getByText('Context')).toBeInTheDocument();
    // Should show selected count of 1 (multiple "1" elements exist, so just check it's there)
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('should show curve editing mode when editing curve', () => {
    const curveSpec: LayoutSpec = {
      root: {
        id: 'root',
        type: 'frame',
        size: { width: 800, height: 600 },
        children: [
          {
            id: 'curve1',
            type: 'curve',
            points: [0, 0, 100, 100],
            stroke: '#000000',
            strokeWidth: 2,
          },
        ],
      },
    };

    render(
      <AttributesSidebar
        {...defaultProps}
        spec={curveSpec}
        editingCurveId="curve1"
      />
    );

    expect(screen.getByText('Curve Editing Mode')).toBeInTheDocument();
    expect(screen.getByText('Exit')).toBeInTheDocument();
  });
});
