'use client';

import { useEffect, useState } from 'react';

export function useNetworkStatus(): boolean | null {
  const initialOnline = typeof navigator === 'undefined' ? null : navigator.onLine;
  const [online, setOnline] = useState<boolean | null>(initialOnline);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function update() {
      setOnline(navigator.onLine);
    }

    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return online;
}
