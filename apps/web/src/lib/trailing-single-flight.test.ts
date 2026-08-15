import { describe, expect, it, vi } from 'vitest';
import { latestSingleFlight, trailingSingleFlight } from './trailing-single-flight';

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

describe('latestSingleFlight', () => {
  it('serializes work and keeps only the newest overlapping value', async () => {
    const releases: Array<() => void> = [];
    const action = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          releases.push(resolve);
        }),
    );
    const run = latestSingleFlight(action);

    const first = run('first');
    run('second');
    run('latest');
    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenLastCalledWith('first');

    releases.shift()?.();
    await vi.waitFor(() => expect(action).toHaveBeenCalledTimes(2));
    expect(action).toHaveBeenLastCalledWith('latest');

    releases.shift()?.();
    await expect(first).resolves.toBeUndefined();
  });
});
