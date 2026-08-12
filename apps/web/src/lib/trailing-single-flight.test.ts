import { describe, expect, it, vi } from 'vitest';
import { trailingSingleFlight } from './trailing-single-flight';

describe('trailingSingleFlight', () => {
  it('coalesces overlaps into one trailing pass', async () => {
    let release: (() => void) | undefined;
    const action = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const run = trailingSingleFlight(action);

    const first = run();
    const overlap = run();
    run();
    expect(action).toHaveBeenCalledOnce();

    release?.();
    await Promise.resolve();
    expect(action).toHaveBeenCalledTimes(2);
    release?.();
    await expect(first).resolves.toBeUndefined();
    await expect(overlap).resolves.toBeUndefined();
  });
});
