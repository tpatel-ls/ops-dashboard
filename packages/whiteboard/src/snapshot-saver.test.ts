import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSnapshotSaver } from './snapshot-saver';

afterEach(() => {
  vi.useRealTimers();
});

describe('createSnapshotSaver', () => {
  it('delivers only the latest snapshot once edits pause', () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const saver = createSnapshotSaver<string>(save, 600);

    saver.schedule('first');
    vi.advanceTimersByTime(400);
    saver.schedule('second');
    vi.advanceTimersByTime(599);
    expect(save).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('second');
  });

  it('delivers a pending snapshot immediately on flush, and only once', () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const saver = createSnapshotSaver<string>(save, 600);

    saver.schedule('stroke');
    saver.flush();
    expect(save).toHaveBeenCalledWith('stroke');

    vi.advanceTimersByTime(600);
    saver.flush();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('does nothing on flush when no snapshot is pending', () => {
    const save = vi.fn();
    createSnapshotSaver<string>(save, 600).flush();
    expect(save).not.toHaveBeenCalled();
  });
});
