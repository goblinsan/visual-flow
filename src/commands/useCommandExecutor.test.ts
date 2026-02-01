import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommandExecutor } from './useCommandExecutor';
import { createUpdateNodePropsCommand } from './updateNodeProps';
import type { LayoutSpec } from '../layout-schema';

describe('useCommandExecutor', () => {
  const mockSpec: LayoutSpec = {
    version: '1.0.0',
    root: {
      id: 'root',
      type: 'frame',
      size: { width: 800, height: 600 },
      children: [
        {
          id: 'rect1',
          type: 'rect',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 100 },
          fill: '#ff0000',
        },
      ],
    },
  };

  it('executes command and updates spec', () => {
    let currentSpec = mockSpec;
    const setSpec = (newSpec: LayoutSpec) => {
      currentSpec = newSpec;
    };

    const { result, rerender } = renderHook(
      ({ spec, selection }) => useCommandExecutor(spec, selection, setSpec),
      { initialProps: { spec: currentSpec, selection: ['rect1'] } }
    );

    const command = createUpdateNodePropsCommand({
      id: 'rect1',
      props: { fill: '#00ff00' },
    });

    act(() => {
      result.current.execute(command);
    });

    // Spec should be updated
    expect(currentSpec.root.children[0]).toMatchObject({
      id: 'rect1',
      fill: '#00ff00',
    });

    // Re-render with new spec
    rerender({ spec: currentSpec, selection: ['rect1'] });
  });

  it('does not update spec if command returns same spec', () => {
    let callCount = 0;
    const setSpec = () => {
      callCount++;
    };

    const { result } = renderHook(() =>
      useCommandExecutor(mockSpec, [], setSpec)
    );

    // Create a command that returns the original spec
    const noOpCommand = {
      id: 'noop',
      apply: () => mockSpec,
    };

    act(() => {
      result.current.execute(noOpCommand);
    });

    // setSpec should not be called since spec didn't change
    expect(callCount).toBe(0);
  });

  it('passes correct context to command', () => {
    const setSpec = () => {};
    const selection = ['rect1', 'rect2'];

    const { result } = renderHook(() =>
      useCommandExecutor(mockSpec, selection, setSpec)
    );

    let capturedContext;
    const command = {
      id: 'test',
      apply: (ctx: any) => {
        capturedContext = ctx;
        return ctx.spec;
      },
    };

    act(() => {
      result.current.execute(command);
    });

    expect(capturedContext).toEqual({
      spec: mockSpec,
      selection,
    });
  });
});
