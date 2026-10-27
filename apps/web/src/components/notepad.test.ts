// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const DRAFT_KEY = 'ops:notepad-draft';
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({ useSearchParams: () => searchParams }));
vi.mock('@/lib/route-items', () => ({ processBrainDump: vi.fn(async () => []) }));
vi.mock('@/lib/use-voice-input', () => ({
  useVoiceInput: () => ({
    available: false,
    listening: false,
    transcribing: false,
    toggle: vi.fn(),
  }),
}));

const { Notepad } = await import('./notepad');

beforeEach(() => {
  vi.useFakeTimers();
  searchParams = new URLSearchParams();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.localStorage.clear();
});

function type(text: string) {
  fireEvent.change(screen.getByLabelText('Work intake'), { target: { value: text } });
}

describe('Notepad draft', () => {
  it('keeps edits made after the debounce when the page is left', () => {
    const { unmount } = render(createElement(Notepad));

    type('Call the vendor about renewal');
    act(() => vi.advanceTimersByTime(500));
    unmount();

    expect(window.localStorage.getItem(DRAFT_KEY)).toBe('Call the vendor about renewal');
  });

  it('keeps edits typed just before the page is left', () => {
    window.localStorage.setItem(DRAFT_KEY, 'Earlier draft');
    const { unmount } = render(createElement(Notepad));

    type('Earlier draft\nNew line');
    unmount();

    expect(window.localStorage.getItem(DRAFT_KEY)).toBe('Earlier draft\nNew line');
  });
});
