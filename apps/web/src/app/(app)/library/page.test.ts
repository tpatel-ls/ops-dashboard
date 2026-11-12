// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/journal-list', () => ({ JournalList: () => 'journal list' }));
vi.mock('@/components/journal-upload', () => ({ JournalUpload: () => 'journal upload' }));
vi.mock('@/components/notes-view', () => ({ NotesView: () => 'notes view' }));
vi.mock('@/components/quotes-view', () => ({ QuotesView: () => 'quotes view' }));
vi.mock('@/components/books-view', () => ({ BooksView: () => 'books view' }));

const { default: LibraryPage } = await import('./page');

afterEach(cleanup);

describe('LibraryPage tabs', () => {
  it('labels the visible panel with the selected tab', () => {
    render(createElement(LibraryPage));
    const notes = screen.getByRole('tab', { name: 'Notes' });

    fireEvent.click(notes);

    const panel = screen.getByRole('tabpanel', { name: 'Notes' });
    expect(panel.textContent).toContain('notes view');
    expect(notes.getAttribute('aria-controls')).toBe(panel.id);
    expect(notes.getAttribute('aria-current')).toBeNull();
  });

  it('keeps one tab stop and moves between tabs with the arrow keys', () => {
    render(createElement(LibraryPage));
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1, -1]);

    tabs[0]!.focus();
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').textContent).toContain('notes view');

    fireEvent.keyDown(tabs[1]!, { key: 'ArrowLeft' });
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tabs[3]);
    expect(screen.getByRole('tabpanel').textContent).toContain('books view');

    fireEvent.keyDown(tabs[3]!, { key: 'Home' });
    expect(document.activeElement).toBe(tabs[0]);
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1, -1]);
  });
});
