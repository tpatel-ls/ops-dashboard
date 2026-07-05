'use client';

import { useEffect, useState } from 'react';

function currentVisibility(): DocumentVisibilityState {
  if (typeof document === 'undefined') return 'visible';
  return document.visibilityState;
}

export function usePageVisibility(): DocumentVisibilityState {
  const [visibility, setVisibility] = useState<DocumentVisibilityState>(currentVisibility);

  useEffect(() => {
    function update() {
      setVisibility(document.visibilityState);
    }

    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  return visibility;
}
