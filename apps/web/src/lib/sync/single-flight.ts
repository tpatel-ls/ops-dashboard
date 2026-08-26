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
        let finalError: unknown;
        let failed = false;
        do {
          pending = false;
          try {
            await task();
            failed = false;
            finalError = undefined;
          } catch (error) {
            failed = true;
            finalError = error;
          }
        } while (pending);
        if (failed) throw finalError;
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
