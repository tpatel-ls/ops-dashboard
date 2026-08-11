export interface SingleFlightQueue {
  run: () => Promise<void>;
  clearPending: () => void;
}

/** Run one task at a time and coalesce overlapping requests into one trailing pass. */
export function createSingleFlightQueue(task: () => Promise<void>): SingleFlightQueue {
  let running: Promise<void> | null = null;
  let pending = false;

  return {
    run() {
      if (running) {
        pending = true;
        return running;
      }
      running = (async () => {
        do {
          pending = false;
          await task();
        } while (pending);
      })().finally(() => {
        running = null;
      });
      return running;
    },
    clearPending() {
      pending = false;
    },
  };
}
