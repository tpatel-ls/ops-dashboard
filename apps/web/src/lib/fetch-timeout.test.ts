import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWithTimeout } from './fetch-timeout';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('fetchWithTimeout', () => {
  it('aborts a request that exceeds its deadline', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    vi.stubGlobal('fetch', fetch);

    const rejection = expect(fetchWithTimeout('/api/test', {}, 50)).rejects.toMatchObject({
      name: 'AbortError',
    });
    await vi.advanceTimersByTimeAsync(50);

    await rejection;
  });

  it('preserves cancellation from the caller signal', async () => {
    const fetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    vi.stubGlobal('fetch', fetch);
    const caller = new AbortController();

    const rejection = expect(
      fetchWithTimeout('/api/test', { signal: caller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    caller.abort();

    await rejection;
    expect(fetch.mock.calls[0]?.[1]?.signal).not.toBe(caller.signal);
    expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2_147_483_648])(
    'rejects an unsupported timeout before starting a request: %s',
    async (timeoutMs) => {
      const fetch = vi.fn();
      vi.stubGlobal('fetch', fetch);

      await expect(fetchWithTimeout('/api/test', {}, timeoutMs)).rejects.toThrow(
        'Request timeout must be a positive supported integer',
      );
      expect(fetch).not.toHaveBeenCalled();
    },
  );
});
