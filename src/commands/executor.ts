import type { Command, CommandContext } from './types';
import { cloneSpec } from './types';

export interface HistoryEntry {
  forward: Command; // the command that was executed
  inverse: Command; // inverse command to undo
  selectionBefore: string[]; // selection before forward
  selectionAfter: string[]; // selection after forward (currently unchanged; placeholder for future updates)
  specBefore: any; // snapshot before
  specAfter: any;  // snapshot after
}

export interface CommandExecutorOptions {
  capacity?: number; // max history size
}

/**
 * CommandExecutor centralizes mutation so later we can add batching, coalescing, multi-step transactions, etc.
 */
export class CommandExecutor {
  private _spec: any;
  private _selection: string[] = [];
  private _history: HistoryEntry[] = [];
  private _redo: HistoryEntry[] = [];
  private _capacity: number;

  constructor(initialSpec: any, opts: CommandExecutorOptions = {}) {
    this._spec = initialSpec;
    this._capacity = opts.capacity ?? 100;
  }

  get spec() { return this._spec; }
  get selection() { return this._selection; }
  get canUndo() { return this._history.length > 0; }
  get canRedo() { return this._redo.length > 0; }
  get historySize() { return this._history.length; }

  execute(cmd: Command): void {
    const beforeSpec = this._spec;
    const beforeSel = [...this._selection];
    const ctx: CommandContext = { spec: beforeSpec, selection: beforeSel };
    const afterSpec = cmd.apply(ctx);
    // Detect structural no-op (same reference or deep-equal JSON)
    if (afterSpec === beforeSpec || JSON.stringify(afterSpec) === JSON.stringify(beforeSpec)) {
      return; // do not record
    }
    let inverse: Command | null = null;
    if (typeof cmd.invert === 'function') {
      inverse = cmd.invert(beforeSpec, afterSpec);
    }
    if (!inverse) {
      // fallback generic inverse is not attempted (explicit inverses only)
      // store a frozen no-op inverse to keep stack consistent
      inverse = { id: `noop-inverse:${cmd.id}`, apply: ctx2 => ctx2.spec };
    }
    const entry: HistoryEntry = {
      forward: cmd,
      inverse,
      selectionBefore: beforeSel,
      selectionAfter: beforeSel, // selection mutation not yet implemented
      specBefore: beforeSpec,
      specAfter: afterSpec,
    };
    this._history.push(entry);
    if (this._history.length > this._capacity) this._history.shift();
    this._redo = []; // clear redo stack
    this._spec = afterSpec;
  }

  undo(): void {
    const entry = this._history.pop();
    if (!entry) return;
    const ctx: CommandContext = { spec: this._spec, selection: [...this._selection] };
    const beforeUndoSpec = this._spec;
    const reverted = entry.inverse.apply(ctx);
    this._redo.push({
      forward: entry.inverse, // for redo we conceptually replay forward
      inverse: entry.forward,
      selectionBefore: entry.selectionAfter,
      selectionAfter: entry.selectionBefore,
      specBefore: beforeUndoSpec,
      specAfter: reverted,
    });
    this._spec = reverted;
    this._selection = [...entry.selectionBefore];
  }

  redo(): void {
    const entry = this._redo.pop();
    if (!entry) return;
    // For redo we reapply the original forward command (stored as inverse in redo stack's entry)
    const forwardCmd = entry.inverse; // inverse of redo entry is original forward
    const ctx: CommandContext = { spec: this._spec, selection: [...this._selection] };
    const beforeRedoSpec = this._spec;
    const reApplied = forwardCmd.apply(ctx);
    let inverse: Command | null = null;
    if (typeof forwardCmd.invert === 'function') inverse = forwardCmd.invert(beforeRedoSpec, reApplied);
    if (!inverse) inverse = { id: `noop-inverse:${forwardCmd.id}`, apply: c => c.spec };
    this._history.push({
      forward: forwardCmd,
      inverse,
      selectionBefore: entry.selectionBefore,
      selectionAfter: entry.selectionAfter,
      specBefore: beforeRedoSpec,
      specAfter: reApplied,
    });
    this._spec = reApplied;
    this._selection = [...entry.selectionAfter];
  }

  setSelection(ids: string[]) { this._selection = [...ids]; }
}

// React hook wrapper
import { useCallback, useRef, useSyncExternalStore } from 'react';

export function useCommandExecutor(initialSpec: any, opts: CommandExecutorOptions = {}) {
  // Initialize executor only once; provide explicit reset method for full spec replacement.
  const executorRef = useRef<CommandExecutor | null>(null);
  if (!executorRef.current) {
    executorRef.current = new CommandExecutor(cloneSpec(initialSpec), opts);
  }
  const executor = executorRef.current;

  // Cache last snapshot so unchanged store state yields referentially stable snapshot.
  const lastSnapRef = useRef<{ spec: any; selection: string[]; canUndo: boolean; canRedo: boolean } | null>(null);

  const subscribe = useCallback((onStoreChange: () => void) => {
    (executor as any)._notify = onStoreChange;
    return () => { if ((executor as any)._notify === onStoreChange) (executor as any)._notify = null; };
  }, [executor]);

  const buildSnapshot = useCallback(() => {
    const next = {
      spec: executor.spec,
      selection: executor.selection,
      canUndo: executor.canUndo,
      canRedo: executor.canRedo,
    };
    const prev = lastSnapRef.current;
    if (
      prev &&
      prev.spec === next.spec &&
      prev.selection === next.selection &&
      prev.canUndo === next.canUndo &&
      prev.canRedo === next.canRedo
    ) {
      return prev; // return identical reference to prevent unnecessary renders
    }
    lastSnapRef.current = next;
    return next;
  }, [executor]);

  const getSnapshot = buildSnapshot; // stable reference via useCallback deps

  // Mutating method wrappers
  const wrappedExecute = useCallback((cmd: Command) => {
    executor.execute(cmd);
    (executor as any)._notify && (executor as any)._notify();
  }, [executor]);
  const wrappedUndo = useCallback(() => {
    executor.undo();
    (executor as any)._notify && (executor as any)._notify();
  }, [executor]);
  const wrappedRedo = useCallback(() => {
    executor.redo();
    (executor as any)._notify && (executor as any)._notify();
  }, [executor]);
  const wrappedSetSelection = useCallback((ids: string[]) => {
    executor.setSelection(ids);
    (executor as any)._notify && (executor as any)._notify();
  }, [executor]);
  const reset = useCallback((newSpec: any) => {
    // Replace executor internal spec & clear history
    (executor as any)._spec = cloneSpec(newSpec);
    (executor as any)._history = [];
    (executor as any)._redo = [];
    (executor as any)._selection = [];
    (executor as any)._notify && (executor as any)._notify();
  }, [executor]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...snapshot,
    execute: wrappedExecute,
    undo: wrappedUndo,
    redo: wrappedRedo,
    setSelection: wrappedSetSelection,
    reset,
    _executor: executor,
  };
}
