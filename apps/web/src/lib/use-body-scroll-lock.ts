'use client';

import { useEffect } from 'react';

/**
 * Hold the page still behind a modal overlay while `active` is true.
 *
 * Without this the document keeps its own scroll position behind the
 * backdrop, so a wheel or touch drag that runs past the end of the overlay
 * chains into the page underneath and the user loses their place in the
 * view they were about to return to.
 *
 * The previous value is captured per activation rather than assumed to be
 * empty, so overlays that stack (the palette opened over the work logger)
 * unwind to the right value in either order.
 */
export function useBodyScrollLock(active = true): void {
  useEffect(() => {
    if (!active) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [active]);
}
