// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '@ops-dashboard/core';

let projects: Partial<Project>[] = [];

vi.mock('dexie-react-hooks', async () => {
  const { useEffect, useState } = await import('react');
  return {
    useLiveQuery: (query: () => Promise<unknown>, deps: unknown[] = []) => {
      const [value, setValue] = useState<unknown>();
      useEffect(() => {
        void query().then(setValue);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, deps);
      return value;
    },
  };
});
vi.mock('@ops-dashboard/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ops-dashboard/core')>()),
  getDb: () => ({
    projects: { toArray: async () => projects, get: async () => undefined },
    domains: { toArray: async () => [] },
    organizations: { toArray: async () => [] },
    tasks: { toArray: async () => [] },
    workLogs: { toArray: async () => [] },
  }),
}));
vi.mock('@/lib/use-settings', () => ({ useLiveSettings: () => ({ slippingDays: 14 }) }));

const { ProjectsBoard } = await import('./projects-board');

afterEach(() => {
  cleanup();
  projects = [];
});

describe('ProjectsBoard', () => {
  it('puts each kind group toggle inside a level-2 heading', async () => {
    projects = [
      { id: 'p1', name: 'Atlas', kind: 'project', status: 'active' },
      { id: 'p2', name: 'Health', kind: 'area', status: 'active' },
    ];
    render(createElement(ProjectsBoard));
    await screen.findByText('Atlas');

    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual(['Projects1', 'Areas1']);
    const toggle = headings[0]!.querySelector('button')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(toggle);
    expect(screen.queryByText('Atlas')).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});
