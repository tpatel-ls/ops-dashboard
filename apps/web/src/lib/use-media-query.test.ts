// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMediaQuery } from './use-media-query';

type Listener = () => void;

function stubMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>();
  let matches = initial;
  const matchMedia = vi.fn((query: string) => ({
    matches,
    media: query,
    addEventListener: (_: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
  }));
  vi.stubGlobal('matchMedia', matchMedia);
  return {
    matchMedia,
    set(next: boolean) {
      matches = next;
      for (const listener of [...listeners]) listener();
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMediaQuery', () => {
  it('reports the current match', () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(min-width: 64rem)'));
    expect(result.current).toBe(true);
  });

  it('re-renders when the query starts matching', () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 64rem)'));
    expect(result.current).toBe(false);

    act(() => media.set(true));
    expect(result.current).toBe(true);
  });

  it('detaches its listener on unmount', () => {
    const media = stubMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 64rem)'));
    expect(media.listenerCount).toBe(1);

    unmount();
    expect(media.listenerCount).toBe(0);
  });

  it('reports false when the environment has no matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useMediaQuery('(min-width: 64rem)'));
    expect(result.current).toBe(false);
  });
});
