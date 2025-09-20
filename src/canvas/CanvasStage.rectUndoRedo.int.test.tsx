import React, { forwardRef, useImperativeHandle } from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import CanvasStage from './CanvasStage';
import { useCommandExecutor } from '../commands/executor';
import type { LayoutSpec } from '../layout-schema';

function makeEmptySpec(): LayoutSpec {
  return {
    root: {
      id: 'root',
      type: 'frame',
      size: { width: 800, height: 600 },
      children: [],
      background: '#ffffff'
    }
  } as any;
}

interface HarnessHandle {
  undo(): void;
  redo(): void;
  getSpec(): any;
  getSelection(): string[];
  setTool(t:string): void;
}

const Harness = forwardRef<HarnessHandle, { initialTool?: string }>((props, ref) => {
  const exec = useCommandExecutor(makeEmptySpec());
  const [tool, setTool] = React.useState(props.initialTool || 'rect');
  useImperativeHandle(ref, () => ({
    undo: exec.undo,
    redo: exec.redo,
    getSpec: () => exec.spec,
    getSelection: () => exec.selection,
    setTool,
  }), [exec]);
  return (
    <CanvasStage
      spec={exec.spec}
      selection={exec.selection}
      setSelection={exec.setSelection}
      executeCommand={exec.execute}
      tool={tool}
      onToolChange={t => setTool(t)}
      width={400}
      height={300}
    />
  );
});


// NOTE: Requires real canvas context (Konva). Skipped under jsdom until node-canvas or mock is configured.
// TODO: Provide Konva testing harness then re-enable.
describe.skip('CanvasStage rectangle undo/redo integration', () => {
  it('can undo and redo rectangle creation', async () => {
    const ref = React.createRef<HarnessHandle>();
    const { getByTestId } = render(<Harness ref={ref} initialTool='rect' />);
    const wrapper = getByTestId('vf-stage-wrapper');
    const canvasEl: HTMLElement | null = wrapper.querySelector('canvas');
    expect(canvasEl).toBeTruthy();

    // Create a rectangle
    await act(async () => {
      fireEvent.mouseDown(canvasEl!, { clientX: 70, clientY: 80, buttons: 1 });
      fireEvent.mouseMove(window, { clientX: 150, clientY: 140, buttons: 1 });
      fireEvent.mouseUp(window, { clientX: 150, clientY: 140, button: 0 });
    });
    // After creation tool switches to select and selection should have 1 id
    expect(ref.current?.getSelection().length).toBe(1);
    const createdId = ref.current?.getSelection()[0];
    expect(createdId).toMatch(/^rect_/);

    // Undo should remove the rectangle and clear selection
    await act(async () => { ref.current?.undo(); });
    expect(ref.current?.getSelection().length).toBe(0);
    const specAfterUndo = ref.current?.getSpec();
    const hasRectAfterUndo = JSON.stringify(specAfterUndo).includes(createdId!);
    expect(hasRectAfterUndo).toBe(false);

    // Redo should re-insert the rectangle and restore selection (currently selection restore logic sets previous selection; we at least assert node exists again)
    await act(async () => { ref.current?.redo(); });
    const specAfterRedo = ref.current?.getSpec();
    const hasRectAfterRedo = JSON.stringify(specAfterRedo).includes(createdId!);
    expect(hasRectAfterRedo).toBe(true);
  });
});
