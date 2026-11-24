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

  it('keeps page shortcuts from acting behind an open modal dialog', () => {
    const quick = vi.fn();
    const chord = vi.fn();
    const palette = vi.fn();
    renderHook(() =>
      useHotkeys([
        { combo: 'q', handler: quick },
        { combo: 'g then s', handler: chord },
        { combo: 'mod+k', handler: palette },
      ]),
    );

    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    const button = document.createElement('button');
    dialog.append(button);
    document.body.append(dialog);
    button.focus();
    for (const key of ['q', 'g', 's']) {
      button.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    }
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));

    expect(quick).not.toHaveBeenCalled();
    expect(chord).not.toHaveBeenCalled();
    expect(palette).toHaveBeenCalledOnce();

    dialog.remove();
    for (const key of ['q', 'g', 's']) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    }
    expect(quick).toHaveBeenCalledOnce();
    expect(chord).toHaveBeenCalledOnce();
  });

  it('lets a combo marked overModal reach an open modal dialog', () => {
    const handler = vi.fn();
    renderHook(() => useHotkeys([{ combo: 'escape', handler, overModal: true }]));

    const dialog = document.createElement('div');
    dialog.setAttribute('aria-modal', 'true');
    document.body.append(dialog);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    dialog.remove();

    expect(handler).toHaveBeenCalledOnce();
  });
});
