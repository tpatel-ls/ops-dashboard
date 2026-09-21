// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useBodyScrollLock } from './use-body-scroll-lock';

afterEach(() => {
  document.body.style.overflow = '';
});

describe('useBodyScrollLock', () => {
  it('holds the page still while active and restores it on unmount', () => {
    const { unmount } = renderHook(() => useBodyScrollLock());
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('leaves the page alone when inactive', () => {
    renderHook(() => useBodyScrollLock(false));
    expect(document.body.style.overflow).toBe('');
  });

  it('restores the value the page already had rather than clearing it', () => {
    document.body.style.overflow = 'scroll';
    const { unmount } = renderHook(() => useBodyScrollLock());
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('unwinds stacked overlays back to the original value', () => {
    const outer = renderHook(() => useBodyScrollLock());
    const inner = renderHook(() => useBodyScrollLock());
    expect(document.body.style.overflow).toBe('hidden');

    inner.unmount();
    expect(document.body.style.overflow).toBe('hidden');

    outer.unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('releases the lock when it toggles off without unmounting', () => {
    const { rerender } = renderHook(({ active }) => useBodyScrollLock(active), {
      initialProps: { active: true },
    });
    expect(document.body.style.overflow).toBe('hidden');

    rerender({ active: false });
    expect(document.body.style.overflow).toBe('');
  });
});
