import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, act, fireEvent } from '@testing-library/react';
import CanvasStage from './CanvasStage';
import { useCommandExecutor } from '../commands/executor';
import type { LayoutSpec } from '../layout-schema';

function makeSpecWithRect(): LayoutSpec {
  return {
    root: {
      id: 'root',
      type: 'frame',
      size: { width: 800, height: 600 },
      background: '#ffffff',
      children: [
        { id: 'r1', type: 'rect', position: { x: 100, y: 120 }, size: { width: 140, height: 110 }, stroke: '#334155', strokeWidth: 6 }
      ]
    }
  } as any;
}

function Harness() {
  const exec = useCommandExecutor(makeSpecWithRect());
  return (
    <CanvasStage
      spec={exec.spec}
      selection={exec.selection}
      setSelection={exec.setSelection}
      executeCommand={exec.execute}
      tool="select"
      onToolChange={() => {}}
      width={500}
      height={400}
    />
  );
}

// Interaction test intent:
//  Simulate user selecting the rectangle, performing a scale transform via Transformer handles, and ensure the
//  logical strokeWidth in spec stays constant. Because Konva relies on real canvas APIs absent in jsdom, we keep
//  this skipped until a Konva test environment (e.g. node-canvas) is configured.
//  Once enabled:
//   1. Click near rect to select it (or programmatically set selection via executor exposure).
//   2. Simulate transform by manipulating node scale + dispatching transform events OR by dragging an anchor.
//   3. After transform end, assert spec still shows strokeWidth === original (6), size changed, and no flicker occurred.
//
//  Potential enable strategy:
//   - Install `canvas` npm package and configure Vitest to use it (setup file already exists: vitest.setup.ts).
//   - Mock minimal Stage methods if full canvas not needed (e.g. monkeypatch HTMLCanvasElement.getContext).
//
//  For now this is a placeholder to capture desired coverage. See also active test scaffolding in
//  CanvasStage.strokeScaleResize.int.test.tsx which lays groundwork for a non-skipped simulation
//  once a deterministic Konva test harness is available.

describe.skip('CanvasStage stroke scaling interaction (visual constant width)', () => {
  it('retains strokeWidth after interactive scale', async () => {
    const { getByTestId } = render(<Harness />);
    const wrapper = getByTestId('vf-stage-wrapper');
    const canvas = wrapper.querySelector('canvas');
    expect(canvas).toBeTruthy();

    // Placeholder pseudo-steps (implementation after Konva env available):
    // act(() => fireEvent.mouseDown(canvas!, { clientX: 110, clientY: 130, buttons: 1 }));
    // act(() => fireEvent.mouseUp(canvas!, { clientX: 110, clientY: 130, button: 0 })); // select
    // ... locate transformer anchor, drag to scale ...
    // expect(updatedSpecRect.strokeWidth).toBe(6);
  });
});
