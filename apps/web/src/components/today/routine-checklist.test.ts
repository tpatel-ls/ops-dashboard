// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { todayIso } from '@ops-dashboard/core';
import type { Routine, RoutineCheck } from '@ops-dashboard/core';

let routines: Partial<Routine>[] = [];
let checks: Partial<RoutineCheck>[] = [];

vi.mock('dexie-react-hooks', async () => {
  const { useEffect, useState } = await import('react');
  return {
    useLiveQuery: (query: () => Promise<unknown>, deps: unknown[] = []) => {
      // Run the real query against the stubbed tables below, again whenever
      // the deps change, as dexie-react-hooks does.
      const [value, setValue] = useState<unknown>();
      useEffect(() => {
        let live = true;
        void query().then((next) => {
          if (live) setValue(next);
        });
        return () => {
          live = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, deps);
      return value;
    },
  };
});
vi.mock('@ops-dashboard/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ops-dashboard/core')>()),
  getDb: () => ({
    routines: { toArray: async () => routines },
    routineChecks: { toArray: async () => checks },
  }),
}));

const { RoutineChecklist } = await import('./routine-checklist');

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  routines = [];
  checks = [];
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

  it('starts a fresh day at local midnight on a page left open', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 5, 23, 59, 30));
    routines = [{ id: 'r1', name: 'Stretch', timeOfDay: 'morning' }];
    checks = [{ id: 'c1', routineId: 'r1', date: '2026-11-05', done: true }];

    render(createElement(RoutineChecklist));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByText('1/1 done')).toBeTruthy();

    await act(async () => vi.advanceTimersByTimeAsync(31_000));

    expect(screen.getByText('0/1 done')).toBeTruthy();
    expect(screen.getByText('2026-11-06')).toBeTruthy();
  });

  it('names the routine each check button toggles', async () => {
    routines = [
      { id: 'r1', name: 'Stretch', timeOfDay: 'morning' },
      { id: 'r2', name: 'Read', timeOfDay: 'morning' },
    ];
    checks = [{ id: 'c1', routineId: 'r1', date: todayIso(), done: true }];

    render(createElement(RoutineChecklist));

    expect(await screen.findByRole('button', { name: 'Uncheck: Stretch' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Check: Read' })).toBeTruthy();
  });

  it('titles the checklist with a level-2 heading', async () => {
    render(createElement(RoutineChecklist));

    expect(await screen.findByRole('heading', { level: 2, name: 'Routines' })).toBeTruthy();
  });
});
