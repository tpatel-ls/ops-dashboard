// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNetworkStatus } from './use-network-status';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useNetworkStatus', () => {
  it('uses the browser state immediately on first render', () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current).toBe(false);
  });

  it('updates when the network transitions online', () => {
    const listeners: Record<string, Array<EventListener>> = {};
    vi.spyOn(window, 'addEventListener').mockImplementation((type, handler) => {
      if (typeof handler === 'function') {
        listeners[type] = [...(listeners[type] ?? []), handler];
      }
      return undefined;
    });
    vi.spyOn(window, 'removeEventListener');

    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });

    const { result } = renderHook(() => useNetworkStatus());
    act(() => {
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
      listeners.online?.[0]?.(new Event('online'));
    });

    expect(result.current).toBe(true);
  });

  it('removes listeners when the component unmounts', () => {
    const listeners: Record<string, Array<EventListener>> = {};
    const addSpy = vi.spyOn(window, 'addEventListener').mockImplementation((type, handler) => {
      if (typeof handler === 'function') {
        listeners[type] = [...(listeners[type] ?? []), handler];
      }
      return undefined;
    });
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useNetworkStatus());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('online', listeners.online?.[0]);
    expect(removeSpy).toHaveBeenCalledWith('offline', listeners.offline?.[0]);
    addSpy.mockRestore();
  });
});
