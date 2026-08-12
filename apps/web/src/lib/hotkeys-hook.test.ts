// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useHotkeys } from './hotkeys';

describe('useHotkeys', () => {
  it('clears an active chord timer when its owner unmounts', () => {
    const clearTimeout = vi.spyOn(window, 'clearTimeout');
    const { unmount } = renderHook(() => useHotkeys([{ combo: 'g then p', handler: vi.fn() }]));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
    unmount();

    expect(clearTimeout).toHaveBeenCalledOnce();
    clearTimeout.mockRestore();
  });

  it('does not start or complete chords with modifier keys held', () => {
    const handler = vi.fn();
    renderHook(() => useHotkeys([{ combo: 'g then p', handler }]));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', shiftKey: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', altKey: true }));

    expect(handler).not.toHaveBeenCalled();
  });
});
