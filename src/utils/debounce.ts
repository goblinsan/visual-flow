export interface Debounced<T extends any[]> {
  (...args: T): void;
  flush(): void;
  cancel(): void;
}

/**
 * Simple trailing-edge debounce. Only the last call within the interval is executed.
 * Returns a debounced function with `flush` and `cancel` helpers.
 */
export function debounce<T extends any[]>(fn: (...args: T) => void, ms: number): Debounced<T> {
  let t: number | undefined;
  let lastArgs: T | undefined;
  const run = () => {
    if (lastArgs) fn(...lastArgs);
    lastArgs = undefined;
    t = undefined;
  };
  const d: any = (...args: T) => {
    lastArgs = args;
    if (t !== undefined) clearTimeout(t);
    t = setTimeout(run, ms) as unknown as number;
  };
  d.flush = () => { if (t !== undefined) { clearTimeout(t); run(); } };
  d.cancel = () => { if (t !== undefined) { clearTimeout(t); t = undefined; lastArgs = undefined; } };
  return d as Debounced<T>;
}

/** Specialized helper for recent color commits: commit only after user pauses. */
export function createRecentColorCommitter(commit: (color: string) => void, delay = 180) {
  const d = debounce((c: string) => commit(c), delay) as Debounced<[string]>;
  return {
    queue(color: string) { d(color); },
    flush() { d.flush(); },
    cancel() { d.cancel(); }
  };
}