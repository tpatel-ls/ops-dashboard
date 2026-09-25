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
 * The lock is reference counted across every caller rather than saved and
 * restored per hook instance. Overlays stack (the palette opens over the work
 * logger, the task drawer over a detail pane) and a per-instance save captures
 * `overflow: hidden` as the "previous" value for whichever lock activates
 * second. Releasing them in any order other than exact reverse then goes wrong
 * twice over: the first release restores the empty string and the page scrolls
 * behind an overlay that is still open, and the last release restores the
 * captured `hidden`, leaving the whole document permanently unscrollable with
 * no overlay left to close. `closeAll` dismisses stacked overlays in one
 * commit, so this was reachable from a single Escape press.
 *
 * Counting instead means only the first lock records the page's real value and
 * only the last release puts it back.
 */
let lockCount = 0;
let restoreOverflow = '';

function acquireScrollLock(): void {
  if (lockCount === 0) {
    restoreOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

function releaseScrollLock(): void {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = restoreOverflow;
}

export function useBodyScrollLock(active = true): void {
  useEffect(() => {
    if (!active) return;
    acquireScrollLock();
    return releaseScrollLock;
  }, [active]);
}
