// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Capture } from '@ops-dashboard/core';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

let captures: Capture[] = [];

const deleteCapture = vi.fn(async () => {});

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => captures }));
vi.mock('@/lib/captures', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/captures')>()),
  deleteCapture,
}));
vi.mock('@/components/view-shell', () => ({
  ViewShell: ({ children }: { children: React.ReactNode }) => children,
}));

const { default: InboxPage } = await import('../app/(app)/inbox/page');

function capture(patch: Partial<Capture>): Capture {
  return {
    id: 'capture-1',
    raw: 'Call the bank',
    source: 'text',
    status: 'pending',
    createdAt: '2026-10-29T09:00:00.000Z',
    updatedAt: '2026-10-29T09:00:00.000Z',
    version: 1,
    deviceId: 'device-1',
    ...patch,
  } as Capture;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  captures = [];
  deleteCapture.mockClear();
});

describe('InboxPage', () => {
  it.each(['link', 'constructor'])('still renders a synced capture whose kind is %s', (aiKind) => {
    captures = [capture({ aiKind: aiKind as Capture['aiKind'] })];

    render(createElement(InboxPage));

    expect(screen.getByText('Call the bank')).toBeTruthy();
  });

  it('deletes a capture only on a second activation', () => {
    captures = [capture({})];
    render(createElement(InboxPage));

    fireEvent.click(screen.getByRole('button', { name: 'Delete capture: Call the bank' }));
    expect(deleteCapture).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Delete capture: Call the bank. Activate again to confirm',
      }),
    );
    expect(deleteCapture).toHaveBeenCalledWith('capture-1');
  });

  it('cancels the pending delete when focus leaves the button', () => {
    captures = [capture({})];
    render(createElement(InboxPage));
    const button = screen.getByRole('button', { name: 'Delete capture: Call the bank' });

    fireEvent.click(button);
    fireEvent.blur(button);
    fireEvent.click(button);

    expect(deleteCapture).not.toHaveBeenCalled();
  });

  it('keeps a capture age current on a page left open', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-29T09:00:10.000Z'));
    captures = [capture({})];
    render(createElement(InboxPage));
    expect(screen.getByText('less than a minute ago')).toBeTruthy();

    await act(async () => vi.advanceTimersByTimeAsync(10 * 60_000));

    expect(screen.getByText('10 minutes ago')).toBeTruthy();
  });
});
