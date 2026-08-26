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

  it('runs a queued pass after a temporary failure', async () => {
    let rejectFirst: ((error: Error) => void) | undefined;
    const task = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockResolvedValueOnce(undefined);
    const queue = createSingleFlightQueue(task);

    const result = queue.run();
    queue.run();
    rejectFirst?.(new Error('temporary sync failure'));

    await expect(result).resolves.toBeUndefined();
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('rejects when the final queued pass fails', async () => {
    const queue = createSingleFlightQueue(
      vi.fn().mockRejectedValue(new Error('persistent sync failure')),
    );

    await expect(queue.run()).rejects.toThrow('persistent sync failure');
  });
});
