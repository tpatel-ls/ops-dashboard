import { afterEach, describe, expect, it, vi } from 'vitest';
import { hapticSuccess, hapticTap, hapticWarning } from './haptics';

const originalNavigator = globalThis.navigator;

afterEach(() => {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: originalNavigator,
  });
});

describe('haptics', () => {
  it('passes the requested pattern to the vibration API', () => {
    const vibrate = vi.fn(() => true);
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { vibrate },
    });

    expect(hapticSuccess()).toBe(true);
    expect(vibrate).toHaveBeenCalledWith([12, 30, 18]);
  });

  it('degrades safely when the vibration API throws', () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        vibrate: vi.fn(() => {
          throw new Error('blocked');
        }),
      },
    });

    expect(hapticTap()).toBe(false);
  });

  it('maps warning patterns to the vibration API', () => {
    const vibrate = vi.fn(() => true);
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { vibrate },
    });

    expect(hapticWarning()).toBe(true);
    expect(vibrate).toHaveBeenCalledWith([24, 40, 24]);
  });

  it('returns false when vibration API is missing', () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {},
    });

    expect(hapticSuccess()).toBe(false);
  });
});
