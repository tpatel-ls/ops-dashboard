// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Person } from '@ops-dashboard/core';

let people: Person[] = [];

// The first query lists the people; the second, keyed on the selection, finds
// the open person, and none is open here.
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (_query: unknown, deps?: unknown[]) =>
    deps ? null : { peopleWithDomains: people.map((person) => ({ person })), domains: [] },
}));

const { CreatePersonForm, PeopleView } = await import('./people-view');

afterEach(() => {
  cleanup();
  people = [];
  vi.useRealTimers();
});

describe('CreatePersonForm', () => {
  it('reports a rejected save and keeps the details', async () => {
    const onCreated = vi.fn();
    render(createElement(CreatePersonForm, { onCreated, onCancel: () => {} }));
    fireEvent.change(screen.getByLabelText('Person name'), { target: { value: 'Ada' } });
    // The relationship limit is 200 characters, so createPerson rejects this one.
    fireEvent.change(screen.getByLabelText('Relationship'), { target: { value: 'x'.repeat(201) } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not create this person. Your details are still here. Person relationship must contain at most 200 characters.',
    );
    expect(onCreated).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Person name') as HTMLInputElement).value).toBe('Ada');
  });
});

describe('PeopleView', () => {
  it('moves a last interaction from today to yesterday at midnight on a page left open', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 28, 23, 59, 30));
    people = [
      {
        id: 'person-1',
        name: 'Ada',
        facts: [],
        interactions: [{ id: 'i1', date: '2026-11-28', note: 'Coffee' }],
      } as unknown as Person,
    ];
    render(createElement(PeopleView));
    expect(screen.getByText('today')).toBeTruthy();

    await act(async () => vi.advanceTimersByTimeAsync(60_000));

    expect(screen.getByText('yesterday')).toBeTruthy();
  });
});
