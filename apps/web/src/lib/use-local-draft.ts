'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePageVisibility } from './use-page-visibility';

function readDraft(key: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

export function useLocalDraft(key: string) {
  const visibility = usePageVisibility();
  const [draft, setDraft] = useState(() => readDraft(key));

  const saveDraft = useCallback(
    (value: string) => {
      try {
        if (value.trim()) window.localStorage.setItem(key, value);
        else window.localStorage.removeItem(key);
      } catch {
        // Storage can be unavailable in private or restricted browser contexts.
      }
    },
    [key],
  );

  useEffect(() => {
    if (visibility === 'hidden') saveDraft(draft);
  }, [draft, saveDraft, visibility]);

  return { draft, setDraft, saveDraft };
}
