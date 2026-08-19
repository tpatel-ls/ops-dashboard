import { afterEach, describe, expect, it, vi } from 'vitest';
import { updateAppBadge } from './app-badge';

const originalNavigator = globalThis.navigator;

afterEach(() => {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: originalNavigator,
  });
});

describe('updateAppBadge', () => {
  it('normalizes fractional badge counts', async () => {
    const setAppBadge = vi.fn(async () => undefined);
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { setAppBadge, clearAppBadge: vi.fn(async () => undefined) },
    });

    await expect(updateAppBadge(3.8)).resolves.toBe(true);
    expect(setAppBadge).toHaveBeenCalledWith(3);
  });

  it('keeps oversized counts within the browser badge range', async () => {
    const setAppBadge = vi.fn(async () => undefined);
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { setAppBadge, clearAppBadge: vi.fn(async () => undefined) },
    });

    await expect(updateAppBadge(Number.MAX_VALUE)).resolves.toBe(true);
    expect(setAppBadge).toHaveBeenCalledWith(4_294_967_295);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 0])(
    'clears invalid or non-positive badge count %s',
    async (count) => {
      const clearAppBadge = vi.fn(async () => undefined);
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: { setAppBadge: vi.fn(async () => undefined), clearAppBadge },
      });

      await expect(updateAppBadge(count)).resolves.toBe(true);
      expect(clearAppBadge).toHaveBeenCalledOnce();
    },
  );
});
