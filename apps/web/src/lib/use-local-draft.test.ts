// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useLocalDraft } from './use-local-draft';

afterEach(() => window.localStorage.clear());

describe('useLocalDraft', () => {
  it('persists the latest draft when its owner unmounts', () => {
    const { result, unmount } = renderHook(() => useLocalDraft('draft-key'));

    act(() => result.current.setDraft('Finish incident review'));
    unmount();

    expect(window.localStorage.getItem('draft-key')).toBe('Finish incident review');
  });

  it('loads the matching draft when the storage key changes', () => {
    window.localStorage.setItem('draft-a', 'First draft');
    window.localStorage.setItem('draft-b', 'Second draft');
    const { result, rerender } = renderHook(
      ({ draftKey }) => useLocalDraft(draftKey),
      { initialProps: { draftKey: 'draft-a' } },
    );

    expect(result.current.draft).toBe('First draft');
    rerender({ draftKey: 'draft-b' });

    expect(result.current.draft).toBe('Second draft');
    expect(window.localStorage.getItem('draft-a')).toBe('First draft');
  });
});
