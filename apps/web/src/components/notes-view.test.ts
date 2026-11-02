// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { NoteForm } = await import('./notes-view');

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
      'Could not save this note. Your draft is still here.',
    );
    expect(onSaved).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Note body') as HTMLTextAreaElement).value).toBe('Keep this');
    expect(screen.getByRole('button', { name: 'Save Note' }).hasAttribute('disabled')).toBe(false);
  });
});
