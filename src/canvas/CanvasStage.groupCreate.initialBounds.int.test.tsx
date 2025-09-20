import React, { useEffect, useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import CanvasStage from './CanvasStage';
import { useCommandExecutor } from '../commands/executor';
import type { LayoutSpec } from '../layout-schema';
import { createGroupNodesCommand } from '../commands/groupNodes';

function buildSpec(): LayoutSpec {
  return {
    root: {
      id: 'root',
      type: 'frame',
      size: { width: 800, height: 600 },
      background: '#fff',
      children: [
        { id: 'r1', type: 'rect', position: { x: 40, y: 30 }, size: { width: 80, height: 40 }, fill: '#eee', stroke: '#000', strokeWidth: 1 },
        { id: 'r2', type: 'rect', position: { x: 180, y: 90 }, size: { width: 60, height: 70 }, fill: '#ddd', stroke: '#000', strokeWidth: 1 }
      ]
    }
  } as LayoutSpec;
}

interface HarnessProps { onReady?: (api: any) => void }
function Harness({ onReady }: HarnessProps) {
  const { spec, execute, _executor } = useCommandExecutor(buildSpec());
  const [selection, setSelection] = useState<string[]>(['r1','r2']);
  const apiRef = React.useRef<any>(null);
  useEffect(() => { onReady?.({ spec, _executor, getApi: () => apiRef.current, execute, setSelection }); }, [spec, onReady, _executor, execute]);
  return (
    <CanvasStage
      spec={spec}
      tool="select"
      onToolChange={() => {}}
      selection={selection}
      setSelection={setSelection}
      executeCommand={execute}
      width={800}
      height={600}
      rectDefaults={{ fill: '#fff', stroke: '#000', strokeWidth: 1, radius: 0, opacity: 1 }}
      exposeApi={(api) => { apiRef.current = api; }}
    />
  );
}

describe('CanvasStage group creation initial bounds', () => {
  it('creates group and attaches transformer with union bounds', async () => {
    let harnessApi: any = null;
    const r = render(<Harness onReady={(api) => { harnessApi = api; }} />);
    await waitFor(() => { expect(harnessApi).not.toBeNull(); });

    // Execute group command on selected r1,r2
    await act(async () => {
      harnessApi.execute(createGroupNodesCommand({ ids: ['r1','r2'] }));
    });
    // Wait for spec to update with new group (find group id)
    let groupId: string | null = null;
    await waitFor(() => {
      const root = harnessApi.spec.root;
      const kids = root.children || [];
      const g = kids.find((c:any) => c.type === 'group');
      expect(g).toBeTruthy();
      groupId = g.id;
    });
    // Directly set selection to new group id
  await act(async () => { harnessApi.setSelection([groupId]); });
    // Poll transformer until it has exactly one node (the group)
    await waitFor(() => {
      const stageApi = harnessApi.getApi?.();
      expect(stageApi).toBeTruthy();
      const tr = stageApi.getTransformer?.();
      expect(tr).toBeTruthy();
      const nodes = tr.nodes();
      expect(nodes.length).toBe(1);
      const groupId = nodes[0].id();
      const bbNode = stageApi.getNodeClientRect?.(groupId) || nodes[0].getClientRect();
      const w = Math.round(bbNode.width);
      const h = Math.round(bbNode.height);
      expect(Math.abs(w - 200)).toBeLessThanOrEqual(2);
      expect(Math.abs(h - 130)).toBeLessThanOrEqual(2);
    });

    r.unmount();
  });
});
