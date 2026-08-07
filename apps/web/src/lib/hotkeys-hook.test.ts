// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useHotkeys } from './hotkeys';

describe('useHotkeys', () => {
  it('clears an active chord timer when its owner unmounts', () => {
    const clearTimeout = vi.spyOn(window, 'clearTimeout');
    const { unmount } = renderHook(() =>
      useHotkeys([{ combo: 'g then p', handler: vi.fn() }]),
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
    unmount();

    expect(clearTimeout).toHaveBeenCalledOnce();
    clearTimeout.mockRestore();
  });
});
