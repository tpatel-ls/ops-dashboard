'use client';

import { useEffect } from 'react';
import { checkAndFireDueReminders, ensureServiceWorker } from '@/lib/notifications';

export function ReminderTicker() {
  useEffect(() => {
    void ensureServiceWorker();
    void checkAndFireDueReminders();
    const id = window.setInterval(() => {
      void checkAndFireDueReminders();
    }, 30_000);
    function onVis() {
      if (document.visibilityState === 'visible') void checkAndFireDueReminders();
    }
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return null;
}
