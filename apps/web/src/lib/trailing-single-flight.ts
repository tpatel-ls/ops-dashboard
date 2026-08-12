export function trailingSingleFlight(action: () => Promise<void>): () => Promise<void> {
  let running: Promise<void> | null = null;
  let rerun = false;

  return () => {
    if (running) {
      rerun = true;
      return running;
    }
    running = (async () => {
      do {
        rerun = false;
        await action();
      } while (rerun);
    })().finally(() => {
      running = null;
    });
    return running;
  };
}
