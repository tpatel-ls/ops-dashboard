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

export function latestSingleFlight<T>(action: (value: T) => Promise<void>) {
  let latest: T;
  let pending = false;
  const run = trailingSingleFlight(async () => {
    if (!pending) return;
    const value = latest;
    pending = false;
    await action(value);
  });

  return (value: T): Promise<void> => {
    latest = value;
    pending = true;
    return run();
  };
}
