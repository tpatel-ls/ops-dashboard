import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('getDeviceId', () => {
  it('returns a persisted device ID', async () => {
    const setItem = vi.fn();
    vi.stubGlobal('window', {
      localStorage: { getItem: () => 'persisted-id', setItem },
    });
    const { getDeviceId } = await import('./id');

    expect(getDeviceId()).toBe('persisted-id');
    expect(setItem).not.toHaveBeenCalled();
  });

  it('keeps a stable in-memory ID when storage reads fail', async () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new DOMException('blocked');
        },
        setItem: vi.fn(),
      },
    });
    const { getDeviceId } = await import('./id');

    const first = getDeviceId();
    expect(first).toHaveLength(26);
    expect(getDeviceId()).toBe(first);
  });

  it('returns the generated ID when storage writes fail', async () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new DOMException('quota exceeded');
        },
      },
    });
    const { getDeviceId } = await import('./id');

    expect(getDeviceId()).toHaveLength(26);
  });

  it.each(['   ', 'x'.repeat(129)])('repairs a malformed stored device ID', async (stored) => {
    const setItem = vi.fn();
    vi.stubGlobal('window', {
      localStorage: { getItem: () => stored, setItem },
    });
    const { getDeviceId } = await import('./id');

    const repaired = getDeviceId();
    expect(repaired).toHaveLength(26);
    expect(setItem).toHaveBeenCalledWith('ops.deviceId', repaired);
  });
});
