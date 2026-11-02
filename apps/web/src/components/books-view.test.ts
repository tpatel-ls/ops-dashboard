// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { BookForm } = await import('./books-view');

afterEach(cleanup);

describe('BookForm', () => {
  it('reports a rejected save and keeps the details', async () => {
    const onSaved = vi.fn();
    render(createElement(BookForm, { onSaved, onCancel: () => {} }));
    fireEvent.change(screen.getByLabelText('Book title'), { target: { value: 'Dune' } });
    // The author limit is 500 characters, so createBook rejects this one.
    fireEvent.change(screen.getByLabelText('Book author'), { target: { value: 'x'.repeat(501) } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Book' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not add this book. Your details are still here.',
    );
    expect(onSaved).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Book title') as HTMLInputElement).value).toBe('Dune');
  });
});
