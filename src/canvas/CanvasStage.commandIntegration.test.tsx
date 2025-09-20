import React, { useEffect, useState } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import CanvasStage from './CanvasStage';
import { useCommandExecutor } from '../commands/executor';
import type { LayoutSpec } from '../layout-schema';

interface HarnessProps {
  onReady?: (api: { getExecutor: () => any; getSpec: () => LayoutSpec; setSelection: (ids: string[]) => void }) => void;
}

function buildSpec(): LayoutSpec {
  return {
    root: {
      id: 'root',
      type: 'frame',
      size: { width: 800, height: 600 },
      background: '#fff',
      children: [
        { id: 'n1', type: 'rect', position: { x: 50, y: 40 }, size: { width: 120, height: 80 }, fill: '#ffffff', stroke: '#334155', strokeWidth: 1 },
      ],
    },
  };
}

function Harness({ onReady }: HarnessProps) {
  const { spec, execute, _executor } = useCommandExecutor(buildSpec());
  const [tool, setTool] = useState('select');
  const [selection, setSelection] = useState<string[]>(['n1']);

  useEffect(() => {
    onReady?.({ getExecutor: () => _executor, getSpec: () => spec, setSelection });
  }, [onReady, spec, _executor]);

  return (
    <CanvasStage
      spec={spec}
      tool={tool}
      onToolChange={setTool}
      selection={selection}
      setSelection={setSelection}
      executeCommand={execute}
      width={800}
      height={600}
      rectDefaults={{ fill: '#ffffff', stroke: '#334155', strokeWidth: 1, radius: 0, opacity: 1 }}
    />
  );
}

// Helper to extract node by id from spec
function findNode(root: any, id: string): any | null {
  if (root.id === id) return root;
  if (Array.isArray(root.children)) {
    for (const c of root.children) {
      const f = findNode(c, id);
      if (f) return f;
    }
  }
  return null;
}

describe('CanvasStage command integration', () => {
  let api: { getExecutor: () => any; getSpec: () => LayoutSpec; setSelection: (ids: string[]) => void } | null = null;

  beforeEach(() => {
    cleanup();
    api = null;
  });

  it('nudging with ArrowRight creates a transform-nodes command and updates position', async () => {
    render(<Harness onReady={(a) => { api = a; }} />);
    await waitFor(() => { expect(api).not.toBeNull(); });
    const exec = api!.getExecutor();
    const beforeHistory = exec.historySize;
    const beforeSpec = api!.getSpec();
    const nodeBefore = findNode(beforeSpec.root, 'n1');
    expect(nodeBefore.position.x).toBe(50);

    fireEvent.keyDown(window, { key: 'ArrowRight' });

    await waitFor(() => {
      const afterSpec = api!.getSpec();
      const nodeAfter = findNode(afterSpec.root, 'n1');
      expect(nodeAfter.position.x).toBe(51);
      expect(exec.historySize).toBe(beforeHistory + 1);
    });
  });

  it('duplicate via Ctrl+D adds a new node and records a command', async () => {
    render(<Harness onReady={(a) => { api = a; }} />);
    await waitFor(() => { expect(api).not.toBeNull(); });
    const exec = api!.getExecutor();
    const baseHistory = exec.historySize;
    const baseChildren = api!.getSpec().root.children.length;

    fireEvent.keyDown(window, { key: 'd', ctrlKey: true });

    await waitFor(() => {
      const nextSpec = api!.getSpec();
      expect(nextSpec.root.children.length).toBe(baseChildren + 1);
      expect(exec.historySize).toBe(baseHistory + 1);
    });
  });

  it('delete via Delete key removes selected node and records a command', async () => {
    render(<Harness onReady={(a) => { api = a; }} />);
    await waitFor(() => { expect(api).not.toBeNull(); });
    const exec = api!.getExecutor();
    const history0 = exec.historySize;
    const childCount0 = api!.getSpec().root.children.length;

  // Ensure selection contains node (wrapped in act to avoid warning)
  await act(async () => { api!.setSelection(['n1']); });

    fireEvent.keyDown(window, { key: 'Delete' });

    await waitFor(() => {
      const specNow = api!.getSpec();
      const node = findNode(specNow.root, 'n1');
      expect(node).toBeNull();
      expect(specNow.root.children.length).toBe(childCount0 - 1);
      expect(exec.historySize).toBe(history0 + 1);
    });
  });
});
