// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Book } from '@ops-dashboard/core';

let liveBooks: Array<Partial<Book>> = [];
vi.mock('@ops-dashboard/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ops-dashboard/core')>()),
  getDb: () => ({ books: { get: async (id: string) => liveBooks.find((b) => b.id === id) } }),
}));

const { BookCard, BookForm } = await import('./books-view');

afterEach(() => {
  cleanup();
  liveBooks = [];
});

describe('BookForm', () => {
  it('reports a rejected save and keeps the details', async () => {
    const onSaved = vi.fn();
    render(createElement(BookForm, { onSaved, onCancel: () => {} }));
    fireEvent.change(screen.getByLabelText('Book title'), { target: { value: 'Dune' } });
    // The author limit is 500 characters, so createBook rejects this one.
    fireEvent.change(screen.getByLabelText('Book author'), { target: { value: 'x'.repeat(501) } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Book' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not add this book. Your details are still here. Book author must contain at most 500 characters.',
    );
    expect(onSaved).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Book title') as HTMLInputElement).value).toBe('Dune');
  });
});

describe('BookCard', () => {
  it('reports a status change the reading timeline rejects', async () => {
    // Finished straight from "want to read", so there is a finish date and no
    // start date. Reading now would start it after it finished.
    const book = {
      id: 'b-1',
      title: 'Dune',
      status: 'finished',
      finishedAt: '2026-01-05T12:00:00.000Z',
      tags: [],
    } as unknown as Book;
    liveBooks = [book];
    render(createElement(BookCard, { book, quotes: [] }));

    fireEvent.change(screen.getByLabelText('Reading status'), { target: { value: 'reading' } });

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Book finish date must not precede its start date.',
    );
  });
});
