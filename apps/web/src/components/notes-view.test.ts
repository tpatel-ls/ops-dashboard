// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Note } from '@ops-dashboard/core';

const { NoteCard, NoteForm } = await import('./notes-view');

afterEach(cleanup);

describe('NoteForm', () => {
  it('reports a rejected save and keeps the draft', async () => {
    const onSaved = vi.fn();
    render(createElement(NoteForm, { onSaved, onCancel: () => {} }));
    fireEvent.change(screen.getByLabelText('Note body'), { target: { value: 'Keep this' } });
    // The source limit is 200 characters, so createNote rejects this one.
    fireEvent.change(screen.getByLabelText('Note source'), { target: { value: 'x'.repeat(201) } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Note' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not save this note. Your draft is still here. Note source must contain at most 200 characters.',
    );
    expect(onSaved).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Note body') as HTMLTextAreaElement).value).toBe('Keep this');
    expect(screen.getByRole('button', { name: 'Save Note' }).hasAttribute('disabled')).toBe(false);
  });
});

describe('NoteCard', () => {
  it('names the note its flag and delete buttons act on', () => {
    render(
      createElement('ul', null, [
        createElement(NoteCard, {
          key: 'n1',
          note: { id: 'n1', title: 'Pricing', body: 'Raise tiers', tags: [] } as unknown as Note,
        }),
        createElement(NoteCard, {
          key: 'n2',
          note: {
            id: 'n2',
            body: 'Call the bank',
            tags: [],
            flaggedForReview: true,
          } as unknown as Note,
        }),
      ]),
    );

    expect(screen.getByRole('button', { name: 'Flag note for review: Pricing' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete note: Pricing' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Unflag note for review: Call the bank' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete note: Call the bank' })).toBeTruthy();
  });
});
