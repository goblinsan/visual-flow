/**
 * useKeyboardShortcuts — Global keyboard shortcuts and outside-click handlers.
 * Extracted from CanvasApp.tsx.
 */
import { useEffect, useRef } from 'react';

export function useKeyboardShortcuts(
  tool: string,
  setTool: (updater: string | ((prev: string) => string)) => void,
  setHelpOpen: (open: boolean) => void,
  setFileOpen: (open: boolean) => void,
): React.RefObject<HTMLDivElement | null> {
  const headerRef = useRef<HTMLDivElement | null>(null);

  // Tool shortcuts + ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;

      if (e.key === 'Escape') {
        setHelpOpen(false);
        setFileOpen(false);
        if (tool !== 'select') setTool('select');
      }
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'v') setTool('select');
        if (key === 'r') setTool((prev: string) => prev === 'rect' ? 'select' : 'rect');
        if (key === 'o') setTool((prev: string) => prev === 'ellipse' ? 'select' : 'ellipse');
        if (key === 'l') setTool((prev: string) => prev === 'line' ? 'select' : 'line');
        if (key === 'p') setTool((prev: string) => prev === 'curve' ? 'select' : 'curve');
        if (key === 't') setTool((prev: string) => prev === 'text' ? 'select' : 'text');
        if (key === 'i') setTool((prev: string) => prev === 'image' ? 'select' : 'image');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tool, setTool, setHelpOpen, setFileOpen]);

  // Outside click for menus
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!headerRef.current) return;
      if (!headerRef.current.contains(e.target as Node)) {
        setHelpOpen(false);
        setFileOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [setHelpOpen, setFileOpen]);

  return headerRef;
}
