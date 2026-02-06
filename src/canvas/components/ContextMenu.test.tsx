import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContextMenu } from './ContextMenu';
import type { LayoutSpec, LayoutNode } from '../../layout-schema';

describe('ContextMenu', () => {
  const mockSpec: LayoutSpec = {
    root: {
      id: 'root',
      type: 'frame',
      position: { x: 0, y: 0 },
      size: { width: 800, height: 600 },
      children: [
        {
          id: 'node1',
          type: 'rect',
          position: { x: 10, y: 10 },
          size: { width: 100, height: 100 },
          fill: '#ff0000',
        },
        {
          id: 'node2',
          type: 'rect',
          position: { x: 120, y: 10 },
          size: { width: 100, height: 100 },
          fill: '#00ff00',
        },
        {
          id: 'group1',
          type: 'group',
          position: { x: 0, y: 0 },
          children: [
            {
              id: 'node3',
              type: 'rect',
              position: { x: 230, y: 10 },
              size: { width: 100, height: 100 },
              fill: '#0000ff',
            },
          ],
        },
      ],
    },
  };

  const mockSelectionContext = {
    parentOf: {
      node1: 'root',
      node2: 'root',
      group1: 'root',
      node3: 'group1',
    },
    nodeById: {
      root: mockSpec.root,
      node1: mockSpec.root.children[0],
      node2: mockSpec.root.children[1],
      group1: mockSpec.root.children[2],
      node3: (mockSpec.root.children[2] as any).children[0],
    },
  };

  const findNode = vi.fn((node: LayoutNode, targetId: string): LayoutNode | null => {
    if (node.id === targetId) return node;
    if ('children' in node && node.children) {
      for (const child of node.children) {
        const found = findNode(child, targetId);
        if (found) return found;
      }
    }
    return null;
  });

  const cloneNode = vi.fn(<T extends LayoutNode>(node: T): T => {
    return JSON.parse(JSON.stringify(node)) as T;
  });

  const collectExistingIds = vi.fn((root: LayoutNode): Set<string> => {
    const ids = new Set<string>();
    const walk = (node: LayoutNode) => {
      ids.add(node.id);
      if ('children' in node && node.children) {
        (node.children as LayoutNode[]).forEach(walk);
      }
    };
    walk(root);
    return ids;
  });

  const createUniqueIdFactory = vi.fn((existing: Set<string>) => {
    return (base: string) => {
      let candidate = `${base}-copy`;
      let i = 2;
      while (existing.has(candidate)) {
        candidate = `${base}-copy-${i++}`;
      }
      existing.add(candidate);
      return candidate;
    };
  });

  const remapIdsAndOffset = vi.fn((
    node: LayoutNode,
    offset: { x: number; y: number },
    makeId: (base: string) => string
  ): LayoutNode => {
    const walk = (n: LayoutNode, isRoot: boolean): LayoutNode => {
      const next = cloneNode(n);
      next.id = makeId(next.id);
      if (isRoot && 'position' in next) {
        const posX = next.position?.x ?? 0;
        const posY = next.position?.y ?? 0;
        next.position = { x: posX + offset.x, y: posY + offset.y };
      }
      if ('children' in next && next.children) {
        next.children = (next.children as LayoutNode[]).map((c) => walk(c, false));
      }
      return next;
    };
    return walk(node, true);
  });

  const defaultProps = {
    menu: { x: 100, y: 100 },
    onClose: vi.fn(),
    selected: ['node1'],
    selectionContext: mockSelectionContext,
    spec: mockSpec,
    setSpec: vi.fn(),
    setSelection: vi.fn(),
    canGroup: false,
    canUngroup: false,
    performGroup: vi.fn(),
    performUngroup: vi.fn(),
    findNode,
    cloneNode,
    collectExistingIds,
    createUniqueIdFactory,
    remapIdsAndOffset,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('returns null when menu is null', () => {
      const { container } = render(<ContextMenu {...defaultProps} menu={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders menu when menu is provided', () => {
      render(<ContextMenu {...defaultProps} />);
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('applies correct positioning styles', () => {
      const { container } = render(<ContextMenu {...defaultProps} />);
      const menu = container.querySelector('.context-menu');
      expect(menu).toBeInTheDocument();
      expect(menu).toHaveStyle({ position: 'absolute', left: '100px', top: '100px' });
    });

    it('includes context-menu class for outside click detection', () => {
      const { container } = render(<ContextMenu {...defaultProps} />);
      const menu = container.querySelector('.context-menu');
      expect(menu).toHaveClass('context-menu');
    });
  });

  describe('Layer Ordering', () => {
    it('shows layer ordering buttons when nodes are selected', () => {
      render(<ContextMenu {...defaultProps} selected={['node1']} />);
      expect(screen.getByText('Move Forward')).toBeInTheDocument();
      expect(screen.getByText('Move To Top')).toBeInTheDocument();
      expect(screen.getByText('Move Lower')).toBeInTheDocument();
      expect(screen.getByText('Move To Bottom')).toBeInTheDocument();
    });

    it('does not show layer ordering buttons when no nodes are selected', () => {
      render(<ContextMenu {...defaultProps} selected={[]} />);
      expect(screen.queryByText('Move Forward')).not.toBeInTheDocument();
    });
  });

  describe('Copy/Paste Operations', () => {
    it('disables Copy button when no selection', () => {
      render(<ContextMenu {...defaultProps} selected={[]} />);
      const copyButton = screen.getByText('Copy');
      expect(copyButton).toBeDisabled();
    });

    it('enables Copy button when nodes are selected', () => {
      render(<ContextMenu {...defaultProps} selected={['node1']} />);
      const copyButton = screen.getByText('Copy');
      expect(copyButton).not.toBeDisabled();
    });

    it('Paste button starts disabled (clipboard empty)', () => {
      render(<ContextMenu {...defaultProps} />);
      const pasteButton = screen.getByText('Paste');
      expect(pasteButton).toBeDisabled();
    });
  });

  describe('Group/Ungroup Operations', () => {
    it('disables Group button when canGroup is false', () => {
      render(<ContextMenu {...defaultProps} canGroup={false} />);
      const groupButton = screen.getByText('Group Selection');
      expect(groupButton).toBeDisabled();
    });

    it('enables Group button when canGroup is true', () => {
      render(<ContextMenu {...defaultProps} canGroup={true} />);
      const groupButton = screen.getByText('Group Selection');
      expect(groupButton).not.toBeDisabled();
    });

    it('disables Ungroup button when canUngroup is false', () => {
      render(<ContextMenu {...defaultProps} canUngroup={false} />);
      const ungroupButton = screen.getByText('Ungroup');
      expect(ungroupButton).toBeDisabled();
    });

    it('enables Ungroup button when canUngroup is true', () => {
      render(<ContextMenu {...defaultProps} canUngroup={true} />);
      const ungroupButton = screen.getByText('Ungroup');
      expect(ungroupButton).not.toBeDisabled();
    });
  });

  describe('Delete Operation', () => {
    it('shows Delete button when nodes are selected', () => {
      render(<ContextMenu {...defaultProps} selected={['node1']} />);
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('does not show Delete button when no nodes are selected', () => {
      render(<ContextMenu {...defaultProps} selected={[]} />);
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });
  });

  describe('Lock/Unlock Operations', () => {
    it('shows Lock button when unlocked nodes are selected', () => {
      render(<ContextMenu {...defaultProps} />);
      expect(screen.getByText('Lock')).toBeInTheDocument();
    });

    it('shows Unlock button when locked nodes are selected', () => {
      const lockedContext = {
        ...mockSelectionContext,
        nodeById: {
          ...mockSelectionContext.nodeById,
          node1: { ...mockSelectionContext.nodeById.node1, locked: true },
        },
      };
      render(<ContextMenu {...defaultProps} selectionContext={lockedContext} />);
      expect(screen.getByText('Unlock')).toBeInTheDocument();
    });

    it('shows both Lock and Unlock when mixed lock states', () => {
      const mixedContext = {
        ...mockSelectionContext,
        nodeById: {
          ...mockSelectionContext.nodeById,
          node1: { ...mockSelectionContext.nodeById.node1, locked: true },
        },
      };
      render(<ContextMenu {...defaultProps} selected={['node1', 'node2']} selectionContext={mixedContext} />);
      expect(screen.getByText('Lock')).toBeInTheDocument();
      expect(screen.getByText('Unlock')).toBeInTheDocument();
    });
  });

  describe('Special Image Operations', () => {
    it('shows Re-enable Aspect button for stretched images', () => {
      const imageContext = {
        ...mockSelectionContext,
        nodeById: {
          ...mockSelectionContext.nodeById,
          node1: {
            id: 'node1',
            type: 'image' as const,
            position: { x: 10, y: 10 },
            size: { width: 100, height: 100 },
            src: 'test.jpg',
            preserveAspect: false
          },
        },
      };
      render(<ContextMenu {...defaultProps} selectionContext={imageContext} />);
      expect(screen.getByText('Re-enable Aspect')).toBeInTheDocument();
    });

    it('does not show Re-enable Aspect button for normal images', () => {
      const imageContext = {
        ...mockSelectionContext,
        nodeById: {
          ...mockSelectionContext.nodeById,
          node1: {
            id: 'node1',
            type: 'image' as const,
            position: { x: 10, y: 10 },
            size: { width: 100, height: 100 },
            src: 'test.jpg',
            preserveAspect: true
          },
        },
      };
      render(<ContextMenu {...defaultProps} selectionContext={imageContext} />);
      expect(screen.queryByText('Re-enable Aspect')).not.toBeInTheDocument();
    });
  });

  describe('Special Text Operations', () => {
    it('shows Reset Text Scale button for scaled text', () => {
      const textContext = {
        ...mockSelectionContext,
        nodeById: {
          ...mockSelectionContext.nodeById,
          node1: {
            id: 'node1',
            type: 'text' as const,
            position: { x: 10, y: 10 },
            size: { width: 100, height: 24 },
            text: 'Test',
            textScaleX: 1.5,
            textScaleY: 1.2
          },
        },
      };
      render(<ContextMenu {...defaultProps} selectionContext={textContext} />);
      expect(screen.getByText('Reset Text Scale')).toBeInTheDocument();
    });

    it('does not show Reset Text Scale button for normal text', () => {
      const textContext = {
        ...mockSelectionContext,
        nodeById: {
          ...mockSelectionContext.nodeById,
          node1: {
            id: 'node1',
            type: 'text' as const,
            position: { x: 10, y: 10 },
            size: { width: 100, height: 24 },
            text: 'Test',
            textScaleX: 1,
            textScaleY: 1
          },
        },
      };
      render(<ContextMenu {...defaultProps} selectionContext={textContext} />);
      expect(screen.queryByText('Reset Text Scale')).not.toBeInTheDocument();
    });
  });

  describe('Close Behavior', () => {
    it('has Close button at the bottom of menu', () => {
      render(<ContextMenu {...defaultProps} />);
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty selection gracefully', () => {
      render(<ContextMenu {...defaultProps} selected={[]} />);
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('handles single node selection', () => {
      render(<ContextMenu {...defaultProps} selected={['node1']} />);
      expect(screen.getByText('Copy')).not.toBeDisabled();
    });

    it('handles multiple node selection', () => {
      render(<ContextMenu {...defaultProps} selected={['node1', 'node2']} />);
      expect(screen.getByText('Copy')).not.toBeDisabled();
    });

    it('renders with minimum required props', () => {
      render(<ContextMenu {...defaultProps} menu={{ x: 0, y: 0 }} selected={[]} />);
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  describe('Menu State', () => {
    it('maintains consistent structure across renders', () => {
      const { rerender } = render(<ContextMenu {...defaultProps} />);
      expect(screen.getByText('Close')).toBeInTheDocument();
      rerender(<ContextMenu {...defaultProps} />);
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('handles rapid menu position changes', () => {
      const { rerender, container } = render(<ContextMenu {...defaultProps} menu={{ x: 100, y: 100 }} />);
      let menu = container.querySelector('.context-menu');
      expect(menu).toHaveStyle({ left: '100px', top: '100px' });

      rerender(<ContextMenu {...defaultProps} menu={{ x: 200, y: 200 }} />);
      menu = container.querySelector('.context-menu');
      expect(menu).toHaveStyle({ left: '200px', top: '200px' });
    });
  });

  describe('Button States', () => {
    it('applies disabled state correctly to Copy button', () => {
      render(<ContextMenu {...defaultProps} selected={[]} />);
      const copyButton = screen.getByText('Copy');
      expect(copyButton).toBeDisabled();
    });

    it('applies hover styles to enabled buttons', () => {
      const { container } = render(<ContextMenu {...defaultProps} selected={['node1']} />);
      const copyButton = screen.getByText('Copy');
      expect(copyButton).toHaveClass('hover:bg-gray-100');
    });

    it('applies cursor-not-allowed to disabled buttons', () => {
      render(<ContextMenu {...defaultProps} canGroup={false} />);
      const groupButton = screen.getByText('Group Selection');
      expect(groupButton).toHaveClass('cursor-not-allowed');
    });
  });
});
