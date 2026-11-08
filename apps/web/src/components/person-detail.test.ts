// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Person } from '@ops-dashboard/core';

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => undefined }));

const { PersonDetail } = await import('./person-detail');

afterEach(cleanup);

const person = { id: 'person-1', name: 'Ada', facts: [], interactions: [] } as unknown as Person;

function renderDetail() {
  render(
    createElement(PersonDetail, { person, domains: [], onClose: () => {}, onDeleted: () => {} }),
  );
}

describe('PersonDetail add forms', () => {
  it('reports a rejected fact and keeps the draft', async () => {
    renderDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    // Fact labels are limited to 200 characters, so the real validator rejects this one.
    const label = 'x'.repeat(201);
    fireEvent.change(screen.getByLabelText('Fact label'), { target: { value: label } });
    fireEvent.change(screen.getByLabelText('Fact value'), { target: { value: 'March 15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add fact' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not save this fact. Your draft is still here. Fact label or value is too long.',
    );
    expect((screen.getByLabelText('Fact label') as HTMLInputElement).value).toBe(label);
  });

  it('reports a rejected interaction and keeps the draft', async () => {
    renderDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Log' }));
    // Interaction notes are limited to 4000 characters.
    const note = 'x'.repeat(4001);
    fireEvent.change(screen.getByLabelText('Interaction notes'), { target: { value: note } });
    fireEvent.click(screen.getByRole('button', { name: 'Log interaction' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not log this interaction. Your draft is still here. Interaction note must contain at most 4000 characters.',
    );
    expect((screen.getByLabelText('Interaction notes') as HTMLTextAreaElement).value).toBe(note);
  });
});

describe('PersonDetail fields', () => {
  it('reports a relationship the validator rejects instead of looking saved', async () => {
    renderDetail();
    // The relationship limit is 200 characters.
    const field = screen.getByLabelText('Relationship');
    fireEvent.change(field, { target: { value: 'x'.repeat(201) } });
    fireEvent.blur(field);

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not save the relationship. It is still in the field. Person relationship must contain at most 200 characters.',
    );
  });
});

describe('PersonDetail rows', () => {
  it('names the fact or interaction each remove button deletes', () => {
    const withRows = {
      ...person,
      facts: [
        { id: 'f1', label: 'Birthday', value: 'March 15' },
        { id: 'f2', label: 'Kids', value: 'Two' },
      ],
      interactions: [
        { id: 'i1', date: '2026-11-01T12:00:00.000Z', note: 'Coffee at the market' },
        { id: 'i2', date: '2026-11-02T12:00:00.000Z', note: `Long call ${'x'.repeat(100)}` },
      ],
    } as unknown as Person;
    render(
      createElement(PersonDetail, {
        person: withRows,
        domains: [],
        onClose: () => {},
        onDeleted: () => {},
      }),
    );

    expect(screen.getByRole('button', { name: 'Remove fact: Birthday' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove fact: Kids' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Remove interaction: Coffee at the market' }),
    ).toBeTruthy();
    const long = screen.getByRole('button', { name: /^Remove interaction: Long call x+…$/ });
    expect(Array.from(long.getAttribute('aria-label')!).length).toBeLessThan(85);
  });
});
