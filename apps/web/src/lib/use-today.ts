'use client';

import { useEffect, useState } from 'react';
import { todayIso } from '@ops-dashboard/core';

/** Milliseconds from `now` until just after the next local midnight. */
export function msUntilNextLocalDay(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  // A second of slack so the timer never fires a hair before midnight and
  // reads the old day again.
  return Math.max(1_000, next.getTime() - now.getTime() + 1_000);
}

/**
 * The current local calendar day (`YYYY-MM-DD`), kept current while the page
 * stays open.
 *
 * Live queries that call `todayIso()` without listing the day as a dependency
 * keep the day they first ran with, so a dashboard left open overnight showed
 * yesterday's routine checks and filed new ones under yesterday. Pass this
 * value to `useLiveQuery` deps instead. It updates at local midnight and when
 * the page becomes visible again, because a sleeping device can miss the timer.
 */
export function useToday(): string {
  const [today, setToday] = useState(todayIso);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function schedule() {
      timer = setTimeout(() => {
        setToday(todayIso());
        schedule();
      }, msUntilNextLocalDay(new Date()));
    }
    function onVisible() {
      if (document.visibilityState === 'visible') setToday(todayIso());
    }
    schedule();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return today;
}
