// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Domain } from '@ops-dashboard/core';

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => undefined }));

const { BookForm } = await import('./books-view');
const { CreatePersonForm } = await import('./people-view');
const { NoteForm } = await import('./notes-view');
const { QuoteForm } = await import('./quotes-view');
const { DomainForm } = await import('./domains-view');

afterEach(cleanup);

const noop = () => {};

describe('inline create forms', () => {
  it.each([
    ['New Book', () => createElement(BookForm, { onSaved: noop, onCancel: noop })],
    ['New person', () => createElement(CreatePersonForm, { onCreated: noop, onCancel: noop })],
    ['New Note', () => createElement(NoteForm, { onSaved: noop, onCancel: noop })],
    ['New Quote', () => createElement(QuoteForm, { onSaved: noop, onCancel: noop })],
    ['New domain', () => createElement(DomainForm, { onSave: async () => {}, onCancel: noop })],
  ])('names the form after its "%s" title', (title, element) => {
    render(element());

    expect(screen.getByRole('form', { name: title })).toBeTruthy();
  });

  it('names the domain form after its edit title when editing', () => {
    const initial = { id: 'd1', name: 'Health', color: '#22c55e' } as Domain;
    render(createElement(DomainForm, { initial, onSave: async () => {}, onCancel: noop }));

    expect(screen.getByRole('form', { name: 'Edit domain' })).toBeTruthy();
  });
});
