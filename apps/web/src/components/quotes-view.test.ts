// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Quote } from '@ops-dashboard/core';

const { AddThoughtInput, QuoteCard, QuoteForm } = await import('./quotes-view');

afterEach(cleanup);

describe('QuoteForm', () => {
  it('reports a rejected save and keeps the draft', async () => {
    const onSaved = vi.fn();
    render(createElement(QuoteForm, { onSaved, onCancel: () => {} }));
    fireEvent.change(screen.getByLabelText('Quote text'), { target: { value: 'Keep going.' } });
    // The source limit is 200 characters, so createQuote rejects this one.
    fireEvent.change(screen.getByLabelText('Quote source'), { target: { value: 'x'.repeat(201) } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Quote' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not save this quote. Your draft is still here. Quote source must contain at most 200 characters.',
    );
    expect(onSaved).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Quote text') as HTMLTextAreaElement).value).toBe('Keep going.');
  });
});

describe('AddThoughtInput', () => {
  it('reports a rejected thought and keeps the text', async () => {
    const onDone = vi.fn();
    const quote = { id: 'q-1', text: 'Keep going.', tags: [], thoughts: [] } as unknown as Quote;
    render(createElement(AddThoughtInput, { quote, onDone }));
    // The thought limit is 2000 characters, so updateQuote rejects this one.
    const thought = 'x'.repeat(2001);
    fireEvent.change(screen.getByLabelText('Quote thought'), { target: { value: thought } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not add this thought. Your text is still here. Thought text must contain at most 2000 characters.',
    );
    expect(onDone).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Quote thought') as HTMLInputElement).value).toBe(thought);
  });
});

describe('QuoteCard thoughts', () => {
  it('names each remove button with a short excerpt of its thought', () => {
    const quote = {
      id: 'q-1',
      text: 'Keep going.',
      tags: [],
      thoughts: [
        { id: 't1', text: 'Short note', at: '2026-11-01T12:00:00.000Z' },
        { id: 't2', text: `Long note ${'x'.repeat(1990)}`, at: '2026-11-02T12:00:00.000Z' },
      ],
    } as unknown as Quote;
    render(createElement(QuoteCard, { quote }));
    fireEvent.click(screen.getByRole('button', { name: /Thoughts \(2\)/ }));

    expect(screen.getByRole('button', { name: 'Remove thought: Short note' })).toBeTruthy();
    const long = screen.getByRole('button', { name: /^Remove thought: Long note x+…$/ });
    expect(Array.from(long.getAttribute('aria-label')!).length).toBeLessThan(80);
  });
});
