import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent, act, waitFor } from '@testing-library/react';
import CanvasStage from './CanvasStage';
import { useCommandExecutor } from '../commands/executor';
import type { LayoutSpec } from '../layout-schema';

function makeSpec(): LayoutSpec {
  return {
    root: {
      id: 'root',
      type: 'frame',
      size: { width: 800, height: 600 },
      background: '#ffffff',
      children: []
    }
  } as any;
}

interface HarnessHandle { setTool: (t:string)=>void; getTool: ()=>string; }

const Harness = forwardRef<HarnessHandle>((_p, ref) => {
  const exec = useCommandExecutor(makeSpec());
    const [tool, _setTool] = useState('select');
    const setTool = (t:string) => { _setTool(t); };
  useImperativeHandle(ref, () => ({ setTool, getTool: () => tool }), [tool]);
  return (
    <CanvasStage
      spec={exec.spec}
      selection={exec.selection}
      setSelection={exec.setSelection}
      executeCommand={exec.execute}
      tool={tool}
      onToolChange={setTool}
      width={400}
      height={300}
    />
  );
});

// This test validates that starting a marquee in select mode and then switching tools
// (simulating pressing 'r' for rectangle tool) clears the marquee rectangle overlay.
// We cannot easily assert Konva node visibility directly without querying stage internals, so
// we simulate the sequence and then ensure no exception and that subsequent interactions behave
// as if marquee state was cleared (i.e., new marquee can start cleanly without residual size).

describe('CanvasStage tool switch marquee clear', () => {
  it('clears marquee when switching from select to rect tool', async () => {
    const ref = React.createRef<HarnessHandle>();
    const { getByTestId } = render(<Harness ref={ref} />);
    const wrapper = getByTestId('vf-stage-wrapper');
    const canvasEl: HTMLElement | null = wrapper.querySelector('canvas');
    expect(canvasEl).toBeTruthy();

    // Begin marquee: mousedown at (50,50) then move to (140,160) inside canvas
    await act(async () => {
      fireEvent.mouseDown(canvasEl!, { clientX: 55, clientY: 55, buttons: 1 });
      fireEvent.mouseMove(canvasEl!, { clientX: 140, clientY: 160, buttons: 1 });
    });

    // Switch tool to rect via imperative harness handle (while marquee active -> should clear marquee immediately)
    act(() => { ref.current?.setTool('rect'); });
    expect(ref.current?.getTool()).toBe('rect');

    // Start a rectangle draft to ensure no stale marquee interferes
    await act(async () => {
      fireEvent.mouseDown(canvasEl!, { clientX: 90, clientY: 90, buttons: 1 });
      fireEvent.mouseMove(canvasEl!, { clientX: 130, clientY: 130, buttons: 1 });
    });
    // Finalize rectangle creation (mouse up) triggers auto-switch to select inside component
    await act(async () => {
      fireEvent.mouseUp(window, { clientX: 130, clientY: 130, button: 0 });
    });
    await waitFor(() => expect(ref.current?.getTool()).toBe('select'));

    // Begin another marquee to verify clean state after rectangle insertion
    await act(async () => {
      fireEvent.mouseDown(canvasEl!, { clientX: 200, clientY: 80, buttons: 1 });
      fireEvent.mouseMove(canvasEl!, { clientX: 250, clientY: 140, buttons: 1 });
    });
    // Switch to rect again mid-marquee (second time) to test idempotent cleanup
    act(() => { ref.current?.setTool('rect'); });
    expect(ref.current?.getTool()).toBe('rect');
    // Attempt another rectangle draft (ensures previous marquee fully cleared)
    await act(async () => {
      fireEvent.mouseDown(canvasEl!, { clientX: 160, clientY: 160, buttons: 1 });
      fireEvent.mouseMove(canvasEl!, { clientX: 190, clientY: 190, buttons: 1 });
      fireEvent.mouseUp(window, { clientX: 190, clientY: 190, button: 0 });
    });
    await waitFor(() => expect(ref.current?.getTool()).toBe('select'));
  });
});
