'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePageVisibility } from './use-page-visibility';

export function useLocalDraft(key: string) {
  const visibility = usePageVisibility();
  const [draft, setDraft] = useState('');

  useEffect(() => {
    try {
      setDraft(window.localStorage.getItem(key) ?? '');
    } catch {
      setDraft('');
    }
  }, [key]);

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
