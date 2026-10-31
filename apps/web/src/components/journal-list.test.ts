// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { JournalEntry } from '@ops-dashboard/core';

const deleteJournalEntry = vi.fn();
vi.mock('@/lib/journal', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/journal')>()),
  deleteJournalEntry,
}));

const { JournalCard } = await import('./journal-list');

afterEach(() => {
  cleanup();
  deleteJournalEntry.mockReset();
});

const entry = {
  id: 'j-1',
  date: '2026-10-30',
  body: 'Shipped the launch plan.',
  mediaUrls: [],
  tags: [],
  source: 'text',
  createdAt: '2026-10-30T12:00:00.000Z',
  updatedAt: '2026-10-30T12:00:00.000Z',
  version: 1,
  deviceId: 'device-1',
} as JournalEntry;

describe('JournalCard', () => {
  it('deletes an entry only on a second activation', () => {
    render(createElement(JournalCard, { entry }));
    const name = 'Delete entry from Friday, 30 Oct 2026';

    fireEvent.click(screen.getByRole('button', { name }));
    expect(deleteJournalEntry).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: `${name}. Activate again to confirm` }));
    expect(deleteJournalEntry).toHaveBeenCalledWith('j-1');
  });

  it('cancels the pending delete when focus leaves the button', () => {
    render(createElement(JournalCard, { entry }));
    const button = screen.getByRole('button', { name: 'Delete entry from Friday, 30 Oct 2026' });

    fireEvent.click(button);
    fireEvent.blur(button);
    fireEvent.click(button);

    expect(deleteJournalEntry).not.toHaveBeenCalled();
  });
});
