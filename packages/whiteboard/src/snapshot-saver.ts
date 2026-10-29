/**
 * Debounced delivery of the latest canvas snapshot, with an explicit flush.
 *
 * The canvas coalesces bursts of edits into one save. Before this existed the
 * pending snapshot was only delivered when the timer fired or the component
 * unmounted, and closing or backgrounding the tab does neither: the last
 * stroke drawn within the debounce window was silently dropped. `flush` lets
 * the canvas deliver it when the page is hidden. Kept free of React and tldraw
 * so it can be tested on its own, like `pen.ts`.
 */
export interface SnapshotSaver<T> {
  /** Remember `snapshot` and deliver it once no newer one arrives for the delay. */
  schedule(snapshot: T): void;
  /** Deliver the pending snapshot now, if there is one. */
  flush(): void;
}

export function createSnapshotSaver<T>(
  save: (snapshot: T) => void,
  delayMs: number,
): SnapshotSaver<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { snapshot: T } | null = null;

  function flush() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    const next = pending;
    pending = null;
    if (next) save(next.snapshot);
  }

  return {
    schedule(snapshot) {
      pending = { snapshot };
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    },
    flush,
  };
}
