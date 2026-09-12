// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useNetworkStatus } from './use-network-status';

describe('useNetworkStatus', () => {
  afterEach(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      writable: true,
      value: true,
    });
  });

  it('hydrates the latest navigator state after mount', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      writable: true,
      value: true,
    });

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('updates on online and offline events', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      writable: true,
      value: true,
    });

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => expect(result.current).toBe(true));

    act(() => {
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => expect(result.current).toBe(false));

    act(() => {
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        writable: true,
        value: true,
      });
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => expect(result.current).toBe(true));
  });
});
