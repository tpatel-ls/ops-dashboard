// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePageVisibility } from './use-page-visibility';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('usePageVisibility', () => {
  it('updates visibility from document events', () => {
    const listeners: Record<string, Array<EventListener>> = {};
    vi.spyOn(document, 'addEventListener').mockImplementation((type, handler) => {
      if (typeof handler === 'function') {
        listeners[type] = [...(listeners[type] ?? []), handler];
      }
      return undefined;
    });
    vi.spyOn(document, 'removeEventListener');

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });

    const { result } = renderHook(() => usePageVisibility());
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      listeners.visibilitychange?.[0]?.(new Event('visibilitychange'));
    });

    expect(result.current).toBe('hidden');
  });

  it('removes the visibility listener when the component unmounts', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => usePageVisibility());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', addSpy.mock.calls[0]?.[1]);
  });
});
