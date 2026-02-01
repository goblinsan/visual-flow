export interface Debounced<T extends readonly unknown[]> {
  (...args: T): void;
  flush(): void;
  cancel(): void;
}

/**
 * Simple trailing-edge debounce. Only the last call within the interval is executed.
 * Returns a debounced function with `flush` and `cancel` helpers.
 */
export function debounce<T extends readonly unknown[]>(fn: (...args: T) => void, ms: number): Debounced<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: T | undefined;
  const run = () => {
    if (lastArgs) fn(...lastArgs);
    lastArgs = undefined;
    timer = undefined;
  };
  const debounced = ((...args: T) => {
    lastArgs = args;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(run, ms);
  }) as Debounced<T>;
  debounced.flush = () => { if (timer !== undefined) { clearTimeout(timer); run(); } };
  debounced.cancel = () => { if (timer !== undefined) { clearTimeout(timer); timer = undefined; lastArgs = undefined; } };
  return debounced;
}

/** Specialized helper for recent color commits: commit only after user pauses. */
export function createRecentColorCommitter(commit: (color: string) => void, delay = 180) {
  const d = debounce<[string]>((color) => commit(color), delay);
  return {
    queue(color: string) { d(color); },
    flush() { d.flush(); },
    cancel() { d.cancel(); }
  };
}