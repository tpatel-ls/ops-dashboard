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
const { processBrainDump } = await import('@/lib/route-items');

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

  it('adds shared text below an unfinished draft instead of replacing it', () => {
    window.localStorage.setItem(DRAFT_KEY, 'Unfinished plan');
    searchParams = new URLSearchParams({ title: 'Article', url: 'https://example.com/a' });
    render(createElement(Notepad));

    expect(screen.getByLabelText('Work intake')).toHaveProperty(
      'value',
      'Unfinished plan\nArticle\nhttps://example.com/a',
    );
  });

  it('does not append the shared text again when the share URL reloads', () => {
    window.localStorage.setItem(DRAFT_KEY, 'Unfinished plan\nArticle');
    searchParams = new URLSearchParams({ title: 'Article' });
    render(createElement(Notepad));

    expect(screen.getByLabelText('Work intake')).toHaveProperty(
      'value',
      'Unfinished plan\nArticle',
    );
  });

  it('opens a share on its own when there is no draft', () => {
    searchParams = new URLSearchParams({ text: 'Shared note' });
    render(createElement(Notepad));

    expect(screen.getByLabelText('Work intake')).toHaveProperty('value', 'Shared note');
  });
});

describe('Notepad capture', () => {
  it('returns focus to the field after a capture is routed', async () => {
    render(createElement(Notepad));
    const field = screen.getByLabelText<HTMLTextAreaElement>('Work intake');
    // Browsers blur a focused textarea when it becomes disabled for routing;
    // jsdom does not, so the routing stands in for that focus loss.
    vi.mocked(processBrainDump).mockImplementationOnce(async () => {
      field.blur();
      return [
        {
          captureId: 'c1',
          kind: 'task',
          title: 'Email Sam',
          recordType: 'task',
          recordId: 't1',
          undo: async () => {},
        },
      ];
    });

    field.focus();
    type('email sam');
    await act(async () => {
      fireEvent.keyDown(field, { key: 'Enter', ctrlKey: true });
    });

    expect(processBrainDump).toHaveBeenCalledWith('email sam', 'notepad');
    expect(field.value).toBe('');
    expect(document.activeElement).toBe(field);
  });
});
