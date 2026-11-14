// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Content, Domain } from '@ops-dashboard/core';

let liveContent: Partial<Content>[] = [];
vi.mock('dexie-react-hooks', async () => {
  const { useEffect, useState } = await import('react');
  return {
    useLiveQuery: (query: () => Promise<unknown>) => {
      const [value, setValue] = useState<unknown>();
      useEffect(() => {
        void query().then(setValue);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return value;
    },
  };
});
vi.mock('@ops-dashboard/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ops-dashboard/core')>()),
  getDb: () => ({
    content: { toArray: async () => liveContent },
    domains: { toArray: async () => [] },
  }),
}));

const { ContentBoard, ContentCard, ContentEditor } = await import('./content-board');

afterEach(() => {
  cleanup();
  liveContent = [];
});

describe('ContentEditor domain picker', () => {
  it('keeps showing an archived domain the item still belongs to', () => {
    const domains = [
      { id: 'work', name: 'Work' },
      { id: 'old', name: 'Old Show', archivedAt: '2026-10-01T00:00:00.000Z' },
      { id: 'gone', name: 'Gone', archivedAt: '2026-10-01T00:00:00.000Z' },
    ] as Domain[];
    const item = {
      id: 'c-1',
      title: 'Pilot episode',
      type: 'video',
      status: 'idea',
      domainId: 'old',
      checklist: [],
    } as unknown as Content;
    render(createElement(ContentEditor, { item, domains, onClose: () => {} }));

    const select = screen.getByRole('combobox', { name: 'Domain' }) as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      'None',
      'Work',
      'Old Show (archived)',
    ]);
    expect(select.value).toBe('old');
  });
});

describe('ContentCard', () => {
  it('names the item its external link opens', () => {
    const item = {
      id: 'c-1',
      title: 'Pilot episode',
      type: 'video',
      status: 'idea',
      url: 'https://example.com/pilot',
      checklist: [],
    } as unknown as Content;
    render(createElement(ContentCard, { item, isOpen: false, onToggle: () => {}, domains: [] }));

    expect(screen.getByRole('link', { name: 'Open link: Pilot episode' })).toBeTruthy();
  });

  it('toggles from a title button that leaves the link outside it', () => {
    const item = {
      id: 'c-1',
      title: 'Pilot episode',
      type: 'video',
      status: 'idea',
      channel: 'YouTube',
      url: 'https://example.com/pilot',
      checklist: [],
    } as unknown as Content;
    const onToggle = vi.fn();
    render(createElement(ContentCard, { item, isOpen: false, onToggle, domains: [] }));

    const toggle = screen.getByRole('button', { name: 'Pilot episode' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.contains(screen.getByRole('link'))).toBe(false);
    expect(toggle.closest('[role="button"]')).toBeNull();

    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('YouTube'));
    expect(onToggle).toHaveBeenCalledTimes(2);
  });
});

describe('ContentBoard', () => {
  it('titles every status column and phone group with a level-2 heading', async () => {
    liveContent = [{ id: 'c-1', title: 'Pilot episode', type: 'video', status: 'idea' }];
    render(createElement(ContentBoard));
    await screen.findAllByText('Pilot episode');

    const statuses = ['Idea', 'Outline', 'Draft', 'Editing', 'Waiting', 'Published', 'Done'];
    // The desktop columns show every status; the phone list skips empty groups.
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual([...statuses, 'Idea1']);
    expect(
      screen.getByRole('heading', { level: 2, name: /^Idea\s*1$/ }).querySelector('button'),
    ).toBeTruthy();
  });
});
