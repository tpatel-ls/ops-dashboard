import { describe, expect, it, vi } from 'vitest';
import { createSingleFlightQueue } from './single-flight';

describe('createSingleFlightQueue', () => {
  it('serializes overlap and coalesces it into one trailing pass', async () => {
    let release: (() => void) | undefined;
    const task = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const queue = createSingleFlightQueue(task);

    const first = queue.run();
    const second = queue.run();
    queue.run();

    expect(second).toBe(first);
    expect(task).toHaveBeenCalledTimes(1);
    release?.();
    await Promise.resolve();
    expect(task).toHaveBeenCalledTimes(2);
    release?.();
    await first;
  });

  it('can discard a trailing pass during teardown', async () => {
    let release: (() => void) | undefined;
    const task = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const queue = createSingleFlightQueue(task);

    const run = queue.run();
    queue.run();
    queue.clearPending();
    release?.();
    await run;

    expect(task).toHaveBeenCalledTimes(1);
  });
});
