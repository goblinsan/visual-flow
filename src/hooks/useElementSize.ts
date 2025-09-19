import { useLayoutEffect, useRef, useState } from 'react';

export interface ElementSize { width: number; height: number; }

/**
 * useElementSize: observes an element's client size using ResizeObserver.
 * Behavior pairs the previous inline hook in CanvasApp (initial sync + stable updates).
 */
export function useElementSize<T extends HTMLElement>(): [React.RefObject<T | null>, ElementSize] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const first = el.getBoundingClientRect();
    if ((first.width || first.height) && (first.width !== size.width || first.height !== size.height)) {
      setSize({ width: first.width, height: first.height });
    }
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setSize(prev => (prev.width === cr.width && prev.height === cr.height) ? prev : { width: cr.width, height: cr.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [size.width, size.height]);

  return [ref, size];
}

export default useElementSize;
