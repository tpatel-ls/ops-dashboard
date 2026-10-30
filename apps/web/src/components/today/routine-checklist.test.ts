// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Routine } from '@ops-dashboard/core';

let routines: Partial<Routine>[] = [];

vi.mock('dexie-react-hooks', async () => {
  const { useEffect, useState } = await import('react');
  return {
    useLiveQuery: (query: () => Promise<unknown>) => {
      // Run the real query once, against the stubbed tables below.
      const [pending] = useState(query);
      const [value, setValue] = useState<unknown>();
      useEffect(() => {
        void pending.then(setValue);
      }, [pending]);
      return value;
    },
  };
});
vi.mock('@ops-dashboard/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ops-dashboard/core')>()),
  getDb: () => ({
    routines: { toArray: async () => routines },
    routineChecks: { toArray: async () => [] },
  }),
}));

const { RoutineChecklist } = await import('./routine-checklist');

afterEach(() => {
  cleanup();
  routines = [];
});

describe('RoutineChecklist', () => {
  it('lists a routine with an unknown time of day under Anytime', async () => {
    routines = [
      { id: 'r1', name: 'Stretch', timeOfDay: 'morning' },
      { id: 'r2', name: 'Night walk', timeOfDay: 'late-night' as Routine['timeOfDay'] },
      { id: 'r3', name: 'Read', timeOfDay: undefined },
    ];

    render(createElement(RoutineChecklist));

    expect(await screen.findByText('0/3 done')).toBeTruthy();
    expect(screen.getByText('Night walk')).toBeTruthy();
    expect(screen.getByText('Read')).toBeTruthy();
    expect(screen.getByText('Anytime')).toBeTruthy();
    expect(screen.getByText('0/2')).toBeTruthy();
  });
});
