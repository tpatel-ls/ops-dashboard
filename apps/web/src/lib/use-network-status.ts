'use client';

import { useEffect, useState } from 'react';

function currentOnlineState(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export function useNetworkStatus(): boolean {
  const [online, setOnline] = useState(currentOnlineState);

  useEffect(() => {
    function update() {
      setOnline(navigator.onLine);
    }

    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return online;
}
