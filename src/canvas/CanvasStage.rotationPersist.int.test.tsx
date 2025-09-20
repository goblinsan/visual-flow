import React, { useEffect, useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import CanvasStage from './CanvasStage';
import { useCommandExecutor } from '../commands/executor';
import type { LayoutSpec } from '../layout-schema';

function buildSpec(): LayoutSpec {
  return {
    root: {
      id: 'root',
      type: 'frame',
      size: { width: 400, height: 300 },
      background: '#fff',
      children: [
        { id: 'r1', type: 'rect', position: { x: 100, y: 80 }, size: { width: 100, height: 60 }, fill: '#fff', stroke: '#000', strokeWidth: 1 }
      ]
    }
  };
}

interface HarnessProps { onReady?: (api: any) => void }
function Harness({ onReady }: HarnessProps) {
  const { spec, execute, _executor } = useCommandExecutor(buildSpec());
  const [selection, setSelection] = useState<string[]>(['r1']);
  const apiRef = React.useRef<any>(null);
  useEffect(() => { onReady?.({ spec, setSelection, _executor, getApi: () => apiRef.current }); }, [spec, onReady, _executor]);
  return (
    <CanvasStage
      spec={spec}
      tool="select"
      onToolChange={() => {}}
      selection={selection}
      setSelection={setSelection}
      executeCommand={execute}
      width={400}
      height={300}
      rectDefaults={{ fill: '#fff', stroke: '#000', strokeWidth: 1, radius: 0, opacity: 1 }}
      exposeApi={(api) => { apiRef.current = api; }}
    />
  );
}

describe('CanvasStage rotation persistence', () => {
  it('rotating a node persists its rotation after transform finalize', async () => {
    const r = render(<Harness />);
    // Wait a tick to ensure exposeApi bound
    await act(async () => {});
    const harnessApi = (r as any).container ? (r as any) : null;
    // Access internal test API
    // Use the onReady-captured API instead (simpler):
    // We re-render with onReady capturing the apiRef
    // Instead, for clarity, re-render Harness with onReady
    let captured: any = null;
    r.rerender(<Harness onReady={(a: any) => { captured = a; }} />);
    await act(async () => {});
    expect(captured).toBeTruthy();
    const stageApi = captured.getApi();
    expect(stageApi).toBeTruthy();
    // Perform programmatic rotation and finalize transform
    act(() => { stageApi.rotateNode('r1', 45); });
    // Force transform end commit
    act(() => { stageApi.forceTransformEnd(); });
    // Assert spec holds rotation (expected future correct behavior)
    const specAfter = captured.spec;
    // Find node
    const node = (function find(n: any, id: string): any|null { if (n.id===id) return n; if (n.children) { for (const c of n.children) { const f=find(c,id); if (f) return f; } } return null; })(specAfter.root, 'r1');
    expect(node?.rotation).toBe(45);
    r.unmount();
  });
});
