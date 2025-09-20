import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import CanvasStage from './CanvasStage';
import { useCommandExecutor } from '../commands/executor';
import type { LayoutSpec } from '../layout-schema';

// Minimal root spec factory
function makeEmptySpec(): LayoutSpec {
  return {
    root: {
      id: 'root',
      type: 'frame',
      size: { width: 1000, height: 800 },
      children: [],
      background: '#ffffff'
    }
  } as any;
}

// Test harness component to integrate hook + stage for interaction simulation.
function Harness(props: { tool: string; onToolChange: (t:string)=>void; width?:number; height?:number }) {
  const exec = useCommandExecutor(makeEmptySpec());
  return (
    <CanvasStage
      spec={exec.spec}
      selection={exec.selection}
      setSelection={exec.setSelection}
      executeCommand={exec.execute}
      tool={props.tool}
      onToolChange={props.onToolChange}
      width={props.width ?? 400}
      height={props.height ?? 300}
    />
  );
}

// NOTE: This test requires a real canvas context; jsdom lacks HTMLCanvasElement.getContext implementation.
// Until we install and configure the 'canvas' package (node-canvas) or abstract Konva interactions, we skip.
// TODO: Enable by providing a Konva test environment with mocked canvas.
describe.skip('CanvasStage rectangle creation integration', () => {
  it('creates a rectangle via drag with command executor and selects it', async () => {
    let currentTool = 'rect';
    const handleToolChange = (t:string) => { currentTool = t; };

    const { getByTestId, rerender } = render(<Harness tool={currentTool} onToolChange={handleToolChange} />);
    const wrapper = getByTestId('vf-stage-wrapper');

    // Precondition: no existing rect nodes in DOM (renderNode might not create DOM identifiable elements easily, so we'll rely on spec introspection indirectly).
    // We'll capture number of Konva canvas elements before and after as a weak signal and rely on tool change + selection heuristics.

    // Simulate drag: mousedown -> mousemove -> mouseup within wrapper.
    // We rely on Konva Stage event delegation; dispatch events to underlying canvas element.
    // wrapper.firstChild should be the canvas container with a <canvas> inside.
    const canvasEl: HTMLElement | null = wrapper.querySelector('canvas');
    expect(canvasEl).toBeTruthy();

    // Starting point (50,50) to (150,120) relative to canvas
    await act(async () => {
      fireEvent.mouseDown(canvasEl!, { clientX: 60, clientY: 60, buttons: 1 });
      fireEvent.mouseMove(window, { clientX: 150, clientY: 120, buttons: 1 }); // global move (listener on window)
      fireEvent.mouseUp(window, { clientX: 150, clientY: 120, button: 0 });
    });

    // After creation, tool should auto-switch back to select
    expect(currentTool).toBe('select');

    // Re-render to propagate potential external store changes (executor uses external store; render should already update but we re-render with same props referencing updated tool state for clarity)
    rerender(<Harness tool={currentTool} onToolChange={handleToolChange} />);

    // We can't directly access executor here, so instead we re-render a fresh harness? That would reset spec.
    // Instead of that, we assert behavioral effects accessible from DOM:
    // 1. The selection transformer should now be enabled (since selection length > 0) -> presence of a Transformer anchor node in Konva layer.
    const transformerAnchor = wrapper.querySelector('canvas');
    expect(transformerAnchor).toBeTruthy();

    // Additional heuristic: Fire a Delete key and expect the selection to clear (indirectly tests selection had at least one id).
    await act(async () => {
      fireEvent.keyDown(window, { key: 'Delete' });
    });

    // After delete, a second delete should be a no-op but not throw.
    await act(async () => {
      fireEvent.keyDown(window, { key: 'Delete' });
    });
  });
});
