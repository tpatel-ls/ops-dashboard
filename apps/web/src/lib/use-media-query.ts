'use client';

import { useSyncExternalStore } from 'react';

/**
 * Track a CSS media query from React.
 *
 * Components whose accessibility semantics change with the layout need the
 * same breakpoint the stylesheet uses. The task edit drawer is the first:
 * below `lg` it is a modal sheet over a dimmed backdrop, at `lg` and wider a
 * docked master-detail pane beside a list that stays interactive.
 *
 * Server rendering and the first client paint report `false`, so callers
 * should pick the query whose false branch is the safe default.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () =>
      typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false,
    () => false,
  );
}
