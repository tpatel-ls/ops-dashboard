// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Organization, Project } from '@ops-dashboard/core';

let liveOrganizations: Array<Partial<Organization>> = [];
// Run each live query once, against the in-memory rows below.
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
  getDb: () => ({ organizations: { toArray: async () => liveOrganizations } }),
}));

const { MetaSection } = await import('./project-detail');

afterEach(() => {
  cleanup();
  liveOrganizations = [];
});

describe('MetaSection organization picker', () => {
  it('keeps showing an archived organization the project still belongs to', async () => {
    liveOrganizations = [
      { id: 'acme', name: 'Acme', order: 0 },
      { id: 'old', name: 'Old Co', order: 1, archivedAt: '2026-10-01T00:00:00.000Z' },
      { id: 'gone', name: 'Gone Co', order: 2, archivedAt: '2026-10-01T00:00:00.000Z' },
    ];
    const project = { id: 'p-1', name: 'Launch', status: 'active', orgId: 'old' } as Project;
    render(createElement(MetaSection, { project, domains: [] }));

    const select = screen.getByRole('combobox', {
      name: 'Project organization',
    }) as HTMLSelectElement;
    await vi.waitFor(() => expect(select.options).toHaveLength(3));
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      'Personal',
      'Acme',
      'Old Co (archived)',
    ]);
    expect(select.value).toBe('old');
  });
});
