import { useCallback } from 'react';
import type { Command, CommandContext } from './types';
import type { LayoutSpec } from '../layout-schema';

export interface CommandExecutor {
  execute: (command: Command) => void;
}

/**
 * Hook for executing commands against a spec with a given selection.
 * Future enhancement: integrate with undo/redo history.
 */
export function useCommandExecutor(
  spec: LayoutSpec,
  selection: string[],
  setSpec: (spec: LayoutSpec) => void
): CommandExecutor {
  const execute = useCallback(
    (command: Command) => {
      const ctx: CommandContext = { spec, selection };
      const nextSpec = command.apply(ctx);
      if (nextSpec !== spec) {
        setSpec(nextSpec);
      }
    },
    [spec, selection, setSpec]
  );

  return { execute };
}
