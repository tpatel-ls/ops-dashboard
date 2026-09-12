// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { usePageVisibility } from './use-page-visibility';

describe('usePageVisibility', () => {
  afterEach(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });

  it('returns the initial document visibility on first render', async () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });

    const { result } = renderHook(() => usePageVisibility());

    await waitFor(() => expect(result.current).toBe('hidden'));
  });

  it('tracks visibility changes from browser events', async () => {
    const { result } = renderHook(() => usePageVisibility());

    expect(result.current).toBe('visible');

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(result.current).toBe('hidden'));
  });
});
