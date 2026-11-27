// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Routine, RoutineCheck } from '@ops-dashboard/core';

let routines: Partial<Routine>[] = [];
let checks: Partial<RoutineCheck>[] = [];

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
    routines: { toArray: async () => routines },
    routineChecks: { toArray: async () => checks },
    domains: { toArray: async () => [] },
  }),
}));
const toggleRoutineCheck = vi.fn();
const archiveRoutine = vi.fn();
vi.mock('@/lib/routines', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/routines')>()),
  toggleRoutineCheck,
  archiveRoutine,
}));

const { RoutinesView } = await import('./routines-view');

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  toggleRoutineCheck.mockReset();
  archiveRoutine.mockReset();
  routines = [];
  checks = [];
});

describe('RoutinesView', () => {
  it('checks a routine off for the new day after midnight on a page left open', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 5, 23, 59, 30));
    routines = [
      { id: 'r1', startDate: '2026-01-01', name: 'Stretch', timeOfDay: 'morning', kind: 'ongoing' },
    ];
    checks = [{ id: 'c1', routineId: 'r1', date: '2026-11-05', done: true }];

    render(createElement(RoutinesView));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByRole('button', { name: 'Mark as not done: Stretch' })).toBeTruthy();

    await act(async () => vi.advanceTimersByTimeAsync(31_000));
    screen.getByRole('button', { name: 'Mark as done today: Stretch' }).click();

    expect(toggleRoutineCheck).toHaveBeenCalledWith('r1', '2026-11-06', true);
  });

  it('does not offer a check-in for a fixed routine past its end day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 19, 9));
    routines = [
      {
        id: 'r1',
        name: 'Couch to 5k',
        timeOfDay: 'morning',
        kind: 'fixed',
        durationDays: 30,
        startDate: '2026-09-01',
        endDate: '2026-09-30',
      },
    ];

    render(createElement(RoutinesView));
    const button = (await screen.findByRole('button', {
      name: 'Not active today: Couch to 5k',
    })) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(screen.getByText('finished · 30 days')).toBeTruthy();
  });

  it('names the routine each row control acts on', async () => {
    routines = [
      { id: 'r1', startDate: '2026-01-01', name: 'Stretch', timeOfDay: 'morning', kind: 'ongoing' },
      { id: 'r2', startDate: '2026-01-01', name: 'Read', timeOfDay: 'morning', kind: 'ongoing' },
    ];

    render(createElement(RoutinesView));

    for (const name of ['Stretch', 'Read']) {
      expect(
        await screen.findByRole('button', { name: `Mark as done today: ${name}` }),
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: `Archive routine: ${name}` })).toBeTruthy();
      expect(screen.getByRole('button', { name: `Delete routine: ${name}` })).toBeTruthy();
    }
  });

  it('titles each time-of-day group with a level-2 heading', async () => {
    routines = [
      { id: 'r1', startDate: '2026-01-01', name: 'Stretch', timeOfDay: 'morning', kind: 'ongoing' },
      { id: 'r2', startDate: '2026-01-01', name: 'Read', timeOfDay: 'anytime', kind: 'ongoing' },
    ];

    render(createElement(RoutinesView));
    await screen.findByText('Stretch');

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Morning', 'Anytime']);
  });

  it('heads the archived group beside the time-of-day groups', async () => {
    routines = [
      { id: 'r1', startDate: '2026-01-01', name: 'Stretch', timeOfDay: 'morning', kind: 'ongoing' },
      {
        id: 'r2',
        startDate: '2026-01-01',
        name: 'Old habit',
        kind: 'ongoing',
        archivedAt: '2026-11-01T00:00:00.000Z',
      },
    ];

    render(createElement(RoutinesView));
    await screen.findByText('Stretch');

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Morning', 'Archived (1)']);
  });
  it('heads the empty state at level 2, directly under the page title', async () => {
    render(createElement(RoutinesView));

    expect(await screen.findByRole('heading', { level: 2, name: 'A clean slate.' })).toBeTruthy();
  });

  it('reports whether the archived routines are shown', async () => {
    routines = [
      {
        id: 'r1',
        startDate: '2026-01-01',
        name: 'Old habit',
        kind: 'ongoing',
        archivedAt: '2026-11-01T00:00:00.000Z',
      },
    ];
    render(createElement(RoutinesView));

    const toggle = await screen.findByRole('button', { name: /Archived \(1\)/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Old habit')).toBeTruthy();
  });

  it('archives a routine only on a second activation', async () => {
    routines = [
      { id: 'r1', startDate: '2026-01-01', name: 'Stretch', timeOfDay: 'morning', kind: 'ongoing' },
    ];
    render(createElement(RoutinesView));

    const button = await screen.findByRole('button', { name: 'Archive routine: Stretch' });
    fireEvent.click(button);
    expect(archiveRoutine).not.toHaveBeenCalled();

    fireEvent.blur(button);
    fireEvent.click(button);
    expect(archiveRoutine).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm archive: Stretch' }));
    expect(archiveRoutine).toHaveBeenCalledWith('r1');
  });
});
