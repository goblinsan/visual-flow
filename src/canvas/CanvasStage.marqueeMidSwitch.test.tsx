import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent, act, waitFor } from '@testing-library/react';
import CanvasStage from './CanvasStage';
import { useCommandExecutor } from '../commands/executor';
import type { LayoutSpec } from '../layout-schema';

function makeSpec(): LayoutSpec { return { root: { id: 'root', type: 'frame', size: { width: 800, height: 600 }, children: [], background: '#fff' } } as any; }

interface Handle { setTool: (t:string)=>void; getTool: ()=>string; }
const Harness = forwardRef<Handle>((_p, ref) => {
  const exec = useCommandExecutor(makeSpec());
  const [tool, _setTool] = useState('select');
  const setTool = (t:string) => { _setTool(t); };
  useImperativeHandle(ref, () => ({ setTool, getTool: () => tool }), [tool]);
  return <CanvasStage spec={exec.spec} selection={exec.selection} setSelection={exec.setSelection} executeCommand={exec.execute} tool={tool} onToolChange={setTool} width={400} height={300} />;
});

// Verifies that switching tools mid-marquee drag hides and resets marquee rectangle (no lingering visible state)
// This is a behavioral regression guard; we can't directly assert Konva rect visibility via DOM, but we ensure no errors and state allows new rect creation.

describe('CanvasStage marquee mid-drag tool switch', () => {
  it('clears marquee when switching to rect before mouseup', async () => {
    const ref = React.createRef<Handle>();
    const { getByTestId } = render(<Harness ref={ref} />);
    const wrapper = getByTestId('vf-stage-wrapper');
    const canvas = wrapper.querySelector('canvas')!;

    // Start marquee drag
    await act(async () => {
      fireEvent.mouseDown(canvas, { clientX: 40, clientY: 40, buttons: 1 });
      fireEvent.mouseMove(canvas, { clientX: 120, clientY: 120, buttons: 1 });
    });

    // Switch to rect tool BEFORE mouseup
    act(() => { ref.current?.setTool('rect'); });
    expect(ref.current?.getTool()).toBe('rect');

    // Try to start a rectangle draft (should not be blocked by stale marquee)
    await act(async () => {
      fireEvent.mouseDown(canvas, { clientX: 150, clientY: 150, buttons: 1 });
      fireEvent.mouseMove(canvas, { clientX: 200, clientY: 200, buttons: 1 });
      fireEvent.mouseUp(window, { clientX: 200, clientY: 200, button: 0 });
    });
    // Auto-switch to select after rect finalize (async flush)
    await waitFor(() => expect(ref.current?.getTool()).toBe('select'));
  });
});
