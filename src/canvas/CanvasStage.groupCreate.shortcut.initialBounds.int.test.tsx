import React, { useEffect, useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import CanvasStage from './CanvasStage';
import { useCommandExecutor } from '../commands/executor';
import type { LayoutSpec } from '../layout-schema';

function buildSpec(): LayoutSpec {
  return {
    root: {
      id: 'root',
      type: 'frame',
      size: { width: 600, height: 400 },
      background: '#fff',
      children: [
        { id: 'a', type: 'rect', position: { x: 40, y: 30 }, size: { width: 80, height: 40 }, fill: '#eee', stroke: '#000', strokeWidth: 1 },
        { id: 'b', type: 'rect', position: { x: 190, y: 100 }, size: { width: 60, height: 70 }, fill: '#ddd', stroke: '#000', strokeWidth: 1 }
      ]
    }
  } as LayoutSpec;
}

interface HarnessProps { expose?: (api:any)=>void }
function Harness({ expose }: HarnessProps) {
  const { spec, execute, _executor } = useCommandExecutor(buildSpec());
  const [selection, setSelection] = useState<string[]>(['a','b']);
  const apiRef = React.useRef<any>(null);
  useEffect(() => { expose?.({ spec, execute, getApi: () => apiRef.current }); }, [spec, execute, expose]);
  return <CanvasStage spec={spec} tool="select" onToolChange={()=>{}} selection={selection} setSelection={setSelection} executeCommand={execute} width={600} height={400} rectDefaults={{ fill:'#fff', stroke:'#000', strokeWidth:1, radius:0, opacity:1 }} exposeApi={api => apiRef.current = api } />;
}

describe('CanvasStage grouping via shortcut initial bounds', () => {
  it('groups with Ctrl+G and shows correct bounds immediately', async () => {
    let api: any = null;
    const r = render(<Harness expose={(a)=> api = a } />);
    await waitFor(() => { expect(api).toBeTruthy(); });

    // Simulate Ctrl+G
    await act(async () => {
      fireEvent.keyDown(window, { key: 'g', ctrlKey: true });
    });

    // Expected union: rect a (40,30,80,40) and b (190,100,60,70) => minX 40 minY 30 maxX 250 maxY 170 => width 210 height 140
    const expectedW = 210;
    const expectedH = 140;

    await waitFor(() => {
      const stageApi = api.getApi();
      const tr = stageApi?.getTransformer?.();
      expect(tr).toBeTruthy();
      const groupNode = tr.nodes()[0];
      const groupId = groupNode.id();
      const bb = stageApi.getNodeClientRect?.(groupId);
      expect(bb).toBeTruthy();
      const w = Math.round(bb!.width);
      const h = Math.round(bb!.height);
      expect(Math.abs(w - expectedW)).toBeLessThanOrEqual(2);
      expect(Math.abs(h - expectedH)).toBeLessThanOrEqual(2);
    });

    r.unmount();
  });
});
