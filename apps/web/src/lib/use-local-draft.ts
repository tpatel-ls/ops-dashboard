'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { readLocalStorage, removeLocalStorage, writeLocalStorage } from './browser-storage';
import { usePageVisibility } from './use-page-visibility';

function readDraft(key: string): string {
  return readLocalStorage(key) ?? '';
}

export function useLocalDraft(key: string) {
  const visibility = usePageVisibility();
  const [drafts, setDrafts] = useState<Record<string, string>>(() => ({ [key]: readDraft(key) }));
  const draft = Object.hasOwn(drafts, key) ? (drafts[key] ?? '') : readDraft(key);
  const latestDraft = useRef(draft);

  useEffect(() => {
    latestDraft.current = draft;
  }, [draft]);

  const setDraft = useCallback(
    (value: string) => setDrafts((current) => ({ ...current, [key]: value })),
    [key],
  );

  const saveDraft = useCallback(
    (value: string) => {
      if (value.trim()) {
        writeLocalStorage(key, value);
      } else {
        removeLocalStorage(key);
      }
    },
    [key],
  );

  useEffect(() => {
    if (visibility === 'hidden') saveDraft(draft);
  }, [draft, saveDraft, visibility]);

  useEffect(() => () => saveDraft(latestDraft.current), [saveDraft]);

  return { draft, setDraft, saveDraft };
}
