/**
 * useUndoRedo — Undo/redo history management for canvas spec.
 * Extracted from CanvasApp.tsx.
 */
import { useCallback, useRef } from 'react';
import type { LayoutSpec } from '../../layout-schema';

export interface UndoRedoResult {
  /** Wrapper around setSpec that records history in local mode */
  setSpec: (next: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => void;
  undo: () => void;
  redo: () => void;
}

export function useUndoRedo(
  setSpecRaw: (next: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => void,
  isCollaborative: boolean,
): UndoRedoResult {
  const historyRef = useRef<{ past: LayoutSpec[]; future: LayoutSpec[] }>({ past: [], future: [] });
  const historyLockRef = useRef(false);

  const setSpec = useCallback((next: LayoutSpec | ((prev: LayoutSpec) => LayoutSpec)) => {
    if (isCollaborative) {
      setSpecRaw(next);
      return;
    }
    setSpecRaw((prev) => {
      const resolved = typeof next === 'function' ? (next as (p: LayoutSpec) => LayoutSpec)(prev) : next;
      if (!historyLockRef.current && resolved !== prev) {
        historyRef.current.past.push(prev);
        historyRef.current.future = [];
      }
      return resolved;
    });
  }, [setSpecRaw, isCollaborative]);

  const undo = useCallback(() => {
    const past = historyRef.current.past;
    if (past.length === 0) return;
    const prev = past.pop()!;
    historyLockRef.current = true;
    setSpecRaw((current) => {
      historyRef.current.future.unshift(current);
      return prev;
    });
    historyLockRef.current = false;
  }, [setSpecRaw]);

  const redo = useCallback(() => {
    const future = historyRef.current.future;
    if (future.length === 0) return;
    const next = future.shift()!;
    historyLockRef.current = true;
    setSpecRaw((current) => {
      historyRef.current.past.push(current);
      return next;
    });
    historyLockRef.current = false;
  }, [setSpecRaw]);

  return { setSpec, undo, redo };
}
