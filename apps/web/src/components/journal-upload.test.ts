// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const fetchWithTimeout = vi.fn();
vi.mock('@/lib/fetch-timeout', () => ({ fetchWithTimeout }));
const createJournalEntry = vi.fn();
vi.mock('@/lib/journal', () => ({ createJournalEntry }));
const toggleRoutineCheck = vi.fn();
vi.mock('@/lib/routines', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/routines')>()),
  toggleRoutineCheck,
}));
let routines: object[] = [];
vi.mock('@ops-dashboard/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ops-dashboard/core')>()),
  getDb: () => ({ routines: { toArray: async () => routines } }),
}));

const { JournalUpload } = await import('./journal-upload');

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  fetchWithTimeout.mockReset();
  createJournalEntry.mockReset();
  toggleRoutineCheck.mockReset();
  routines = [];
});

describe('JournalUpload mood picker', () => {
  it('tells assistive technology which mood is selected, and follows a change', async () => {
    fetchWithTimeout.mockResolvedValue({
      status: 200,
      json: async () => ({
        ok: true,
        result: { summary: 'A day', body: 'Walked.', mood: 'good', tags: [], habitsDone: [] },
      }),
    });
    render(createElement(JournalUpload));
    fireEvent.click(screen.getByRole('button', { name: /Paste text/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Journal text to analyze' }), {
      target: { value: 'Walked.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyse with AI/ }));

    const group = await screen.findByRole('group', { name: 'Entry mood' });
    const pressed = () =>
      Array.from(group.querySelectorAll('[aria-pressed="true"]')).map((b) => b.textContent);
    expect(pressed()).toEqual([expect.stringContaining('Good')]);

    fireEvent.click(screen.getByRole('button', { name: /Rough/ }));
    expect(pressed()).toEqual([expect.stringContaining('Rough')]);
  });
});

describe('JournalUpload extracted details', () => {
  async function analyse(result: object) {
    fetchWithTimeout.mockResolvedValue({ status: 200, json: async () => ({ ok: true, result }) });
    render(createElement(JournalUpload));
    fireEvent.click(screen.getByRole('button', { name: /Paste text/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Journal text to analyze' }), {
      target: { value: 'Walked.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyse with AI/ }));
    await screen.findByRole('group', { name: 'Entry mood' });
  }

  it('lists the extracted tags and habits under their labels', async () => {
    await analyse({
      summary: 'A day',
      body: 'Walked.',
      mood: 'good',
      tags: ['walk', 'park'],
      habitsDone: ['Morning walk'],
    });

    const items = (name: string) =>
      Array.from(screen.getByRole('list', { name }).querySelectorAll('li')).map(
        (item) => item.textContent,
      );
    expect(items('Tags')).toEqual(['#walk', '#park']);
    expect(items('Habits detected')).toEqual(['Morning walk']);
  });

  it('says when no tags were found instead of showing a bare label', async () => {
    await analyse({ summary: 'A day', body: 'Walked.', mood: 'good', tags: [], habitsDone: [] });

    expect(screen.queryByRole('list', { name: 'Tags' })).toBeNull();
    expect(screen.getByText('None found')).toBeTruthy();
    expect(screen.queryByText('Habits detected')).toBeNull();
  });
});

describe('JournalUpload habit check-ins', () => {
  it('skips a finished fixed routine instead of failing a saved entry', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 19, 9));
    routines = [
      { id: 'walk', name: 'Morning walk', startDate: '2026-01-01' },
      {
        id: 'c25k',
        name: 'Couch to 5k',
        kind: 'fixed',
        durationDays: 30,
        startDate: '2026-09-01',
        endDate: '2026-09-30',
      },
    ];
    createJournalEntry.mockResolvedValue({});
    const onSaved = vi.fn();
    fetchWithTimeout.mockResolvedValue({
      status: 200,
      json: async () => ({
        ok: true,
        result: {
          summary: 'A day',
          body: 'Walked, then ran.',
          mood: 'good',
          tags: [],
          habitsDone: ['Morning walk', 'Couch to 5k'],
        },
      }),
    });
    render(createElement(JournalUpload, { onSaved }));
    fireEvent.click(screen.getByRole('button', { name: /Paste text/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Journal text to analyze' }), {
      target: { value: 'Walked, then ran.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyse with AI/ }));
    await screen.findByRole('group', { name: 'Entry mood' });
    fireEvent.click(screen.getByRole('button', { name: 'Save entry' }));

    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(toggleRoutineCheck).toHaveBeenCalledTimes(1);
    expect(toggleRoutineCheck).toHaveBeenCalledWith('walk', '2026-11-19', true, 'journal');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('JournalUpload long text', () => {
  it('keeps text longer than the extract route reads as written instead of truncating it', async () => {
    const long = 'Walked by the river. '.repeat(500).trim();
    render(createElement(JournalUpload));
    fireEvent.click(screen.getByRole('button', { name: /Paste text/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Journal text to analyze' }), {
      target: { value: long },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyse with AI/ }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/longer than AI analysis reads/);
    expect(
      (screen.getByRole('textbox', { name: 'Journal entry' }) as HTMLTextAreaElement).value,
    ).toBe(long);
    expect(fetchWithTimeout).not.toHaveBeenCalled();
  });

  it('says why a manual entry was rejected and keeps the text', async () => {
    // The real validator rejects a body over 50000 characters before touching the database.
    const { createJournalEntry: realCreate } =
      await vi.importActual<typeof import('@/lib/journal')>('@/lib/journal');
    createJournalEntry.mockImplementation(realCreate);
    const long = 'x'.repeat(50_001);
    render(createElement(JournalUpload));
    fireEvent.click(screen.getByRole('button', { name: /Paste text/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Journal text to analyze' }), {
      target: { value: long },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyse with AI/ }));
    await screen.findByRole('textbox', { name: 'Journal entry' });
    fireEvent.click(screen.getByRole('button', { name: 'Save entry' }));

    expect(await screen.findByText(/at most 50000 characters/)).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe(
      'Could not save this entry. Your text is still here. Journal entry body must contain at most 50000 characters.',
    );
    expect(
      (screen.getByRole('textbox', { name: 'Journal entry' }) as HTMLTextAreaElement).value,
    ).toBe(long);
  });
});
