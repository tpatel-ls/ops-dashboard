'use client';

import { useEffect, useState } from 'react';

/**
 * The current time, refreshed every `intervalMs` and when the page becomes
 * visible again.
 *
 * Relative labels such as "5 minutes ago" were computed during render, so on a
 * page left open they only moved when the row re-rendered for another reason:
 * a notification read "less than a minute ago" for hours. Pass this value as
 * the `now` of the label instead.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, intervalMs);
    function onVisible() {
      if (document.visibilityState === 'visible') tick();
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);

  return now;
}
