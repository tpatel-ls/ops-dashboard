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

  it('runs a queued trailing pass after the active pass fails', async () => {
    let rejectFirst: ((error: Error) => void) | undefined;
    const action = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockResolvedValueOnce(undefined);
    const run = trailingSingleFlight(action);

    const result = run();
    run();
    rejectFirst?.(new Error('temporary failure'));

    await expect(result).resolves.toBeUndefined();
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('rejects when the final queued pass still fails', async () => {
    const action = vi.fn().mockRejectedValue(new Error('persistent failure'));
    const run = trailingSingleFlight(action);

    await expect(run()).rejects.toThrow('persistent failure');
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

  it('persists the latest value after an earlier save fails', async () => {
    let rejectFirst: ((error: Error) => void) | undefined;
    const saved: string[] = [];
    const action = vi.fn(async (value: string) => {
      if (value === 'first') {
        await new Promise<void>((_resolve, reject) => {
          rejectFirst = reject;
        });
        return;
      }
      saved.push(value);
    });
    const run = latestSingleFlight(action);

    const result = run('first');
    run('latest');
    rejectFirst?.(new Error('temporary failure'));

    await expect(result).resolves.toBeUndefined();
    expect(saved).toEqual(['latest']);
  });
});
