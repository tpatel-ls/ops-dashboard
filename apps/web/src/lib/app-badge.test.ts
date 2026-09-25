import { afterEach, describe, expect, it, vi } from 'vitest';
import { isPendingBadgeCapture, supportsAppBadge, updateAppBadge } from './app-badge';

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

function withNavigator(value: unknown): void {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value });
}

describe('supportsAppBadge', () => {
  it('requires both halves of the Badging API', () => {
    // `updateAppBadge` needs `clearAppBadge` to take a badge back down, so a
    // browser offering only `setAppBadge` would strand a stale count on the
    // installed icon. Treat that as unsupported rather than half-usable.
    withNavigator({ setAppBadge: vi.fn(), clearAppBadge: vi.fn() });
    expect(supportsAppBadge()).toBe(true);

    withNavigator({ setAppBadge: vi.fn() });
    expect(supportsAppBadge()).toBe(false);

    withNavigator({ clearAppBadge: vi.fn() });
    expect(supportsAppBadge()).toBe(false);

    withNavigator({});
    expect(supportsAppBadge()).toBe(false);
  });
});

describe('updateAppBadge on a browser without the Badging API', () => {
  it('reports failure instead of throwing', async () => {
    withNavigator({});
    await expect(updateAppBadge(3)).resolves.toBe(false);
  });

  it('reports failure when the browser rejects the badge write', async () => {
    withNavigator({
      setAppBadge: vi.fn(async () => {
        throw new Error('not allowed');
      }),
      clearAppBadge: vi.fn(async () => undefined),
    });
    await expect(updateAppBadge(3)).resolves.toBe(false);
  });
});

describe('isPendingBadgeCapture', () => {
  it('excludes deleted captures from the pending badge count', () => {
    expect(isPendingBadgeCapture({ status: 'pending' })).toBe(true);
    expect(
      isPendingBadgeCapture({ status: 'pending', deletedAt: '2026-08-20T12:00:00.000Z' }),
    ).toBe(false);
    expect(isPendingBadgeCapture({ status: 'triaged' })).toBe(false);
  });
});
