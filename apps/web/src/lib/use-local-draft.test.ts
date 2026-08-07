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
});
