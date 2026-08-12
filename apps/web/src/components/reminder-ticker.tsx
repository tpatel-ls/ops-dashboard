'use client';

import { useEffect } from 'react';
import { checkAndFireDueReminders, ensureServiceWorker } from '@/lib/notifications';
import { trailingSingleFlight } from '@/lib/trailing-single-flight';

export function ReminderTicker() {
  useEffect(() => {
    const check = trailingSingleFlight(async () => {
      await checkAndFireDueReminders();
    });
    void ensureServiceWorker();
    void check();
    const id = window.setInterval(() => {
      void check();
    }, 30_000);
    function onVis() {
      if (document.visibilityState === 'visible') void check();
    }
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return null;
}
