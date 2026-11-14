// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const fetchWithTimeout = vi.fn();
vi.mock('@/lib/fetch-timeout', () => ({ fetchWithTimeout }));
vi.mock('@/lib/journal', () => ({ createJournalEntry: vi.fn() }));
vi.mock('@/lib/routines', () => ({ toggleRoutineCheck: vi.fn() }));
vi.mock('@ops-dashboard/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ops-dashboard/core')>()),
  getDb: () => ({ routines: { toArray: async () => [] } }),
}));

const { JournalUpload } = await import('./journal-upload');

afterEach(() => {
  cleanup();
  fetchWithTimeout.mockReset();
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
});
