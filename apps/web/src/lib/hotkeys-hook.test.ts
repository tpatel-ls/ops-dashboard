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

  it('cancels a chord when an unrelated key intervenes', () => {
    const handler = vi.fn();
    renderHook(() => useHotkeys([{ combo: 'g then p', handler }]));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }));
    expect(handler).not.toHaveBeenCalled();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('skips an unmodified combo while a text field has focus', () => {
    // Why every overlay owns its own Escape listener: a component that
    // autofocuses an input (the command palette) can never be dismissed by the
    // global `escape` hotkey, because the event target is the field.
    const handler = vi.fn();
    renderHook(() => useHotkeys([{ combo: 'escape', handler }]));

    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(handler).not.toHaveBeenCalled();

    input.remove();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not complete same-key chords from keyboard auto-repeat', () => {
    const handler = vi.fn();
    renderHook(() => useHotkeys([{ combo: 'g then g', handler }]));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', repeat: true }));
    expect(handler).not.toHaveBeenCalled();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
    expect(handler).toHaveBeenCalledOnce();
  });
});
