import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isoDay } from '@ops-dashboard/core';

interface Rows {
  tasks: unknown[];
  routineChecks: unknown[];
  journalEntries: unknown[];
  workLogs: unknown[];
}

const rows = vi.hoisted<() => Rows>(() => {
  const state: Rows = { tasks: [], routineChecks: [], journalEntries: [], workLogs: [] };
  return () => state;
});

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>('@ops-dashboard/core');
  const table = (key: keyof Rows) => ({
    filter: (predicate: (row: never) => boolean) => ({
      toArray: async () => (rows()[key] as never[]).filter(predicate),
    }),
  });
  return {
    ...actual,
    getDb: () => ({
      tasks: table('tasks'),
      routineChecks: table('routineChecks'),
      journalEntries: table('journalEntries'),
      workLogs: table('workLogs'),
    }),
  };
});

import {
  activityScores,
  activityTimestampOnOrAfter,
  activityTimestampWithin,
  aggregateActivity,
  loadActivity,
  normalizeActivityDays,
  workLogActivityContribution,
} from './activity';

describe('aggregateActivity', () => {
  it('normalizes invalid and negative scores to an empty day', () => {
    const result = aggregateActivity(
      new Map([
        ['2026-07-27', Number.NaN],
        ['2026-07-28', -3],
        ['2026-07-29', Number.POSITIVE_INFINITY],
      ]),
      new Date(2026, 6, 27, 12),
      new Date(2026, 6, 29, 12),
    );

    expect(result).toEqual([
      { date: '2026-07-27', count: 0, level: 0 },
      { date: '2026-07-28', count: 0, level: 0 },
      { date: '2026-07-29', count: 0, level: 0 },
    ]);
  });

  it('rejects invalid, inverted, and unbounded ranges', () => {
    expect(() => aggregateActivity(new Map(), new Date('invalid'), new Date('2026-08-24'))).toThrow(
      'Activity range must be valid',
    );
    expect(() =>
      aggregateActivity(new Map(), new Date('2026-08-25'), new Date('2026-08-24')),
    ).toThrow('Activity range must be valid');
    expect(() =>
      aggregateActivity(new Map(), new Date('2000-01-01'), new Date('2026-08-24')),
    ).toThrow('Activity range must contain at most');
  });

  it('preserves valid fractional activity contributions', () => {
    const result = aggregateActivity(
      new Map([['2026-07-29', 2.5]]),
      new Date(2026, 6, 29, 12),
      new Date(2026, 6, 29, 12),
    );

    expect(result).toEqual([{ date: '2026-07-29', count: 2.5, level: 1 }]);
  });
});

describe('activityTimestampWithin', () => {
  const start = new Date('2026-08-17T05:00:00.000Z');
  const end = new Date('2026-08-25T04:59:59.999Z');

  it('compares offset timestamps by instant within an inclusive range', () => {
    expect(activityTimestampWithin('2026-08-16T23:30:00-05:00', start, end)).toBe(false);
    expect(activityTimestampWithin('2026-08-24T23:30:00-05:00', start, end)).toBe(true);
  });

  it('rejects malformed timestamps and ranges', () => {
    expect(activityTimestampWithin('not-a-date', start, end)).toBe(false);
    expect(activityTimestampWithin('2026-08-20T12:00:00Z', end, start)).toBe(false);
    expect(activityTimestampWithin('2026-08-20T12:00:00Z', new Date('invalid'), end)).toBe(false);
  });
});

describe('normalizeActivityDays', () => {
  it('bounds history windows to a positive ten-year range', () => {
    expect(normalizeActivityDays(0)).toBe(1);
    expect(normalizeActivityDays(30.9)).toBe(30);
    expect(normalizeActivityDays(50_000)).toBe(3660);
  });

  it('falls back for non-finite history windows', () => {
    expect(normalizeActivityDays(Number.NaN)).toBe(365);
    expect(normalizeActivityDays(Number.POSITIVE_INFINITY)).toBe(365);
  });
});

describe('workLogActivityContribution', () => {
  it('scores valid work durations', () => {
    expect(workLogActivityContribution(30)).toBe(0.5);
    expect(workLogActivityContribution(90)).toBe(1.5);
  });

  it.each([0, -30, 1.5, 1441, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    'ignores malformed legacy duration %s',
    (minutes) => {
      expect(workLogActivityContribution(minutes)).toBe(0);
    },
  );
});

describe('activityTimestampOnOrAfter', () => {
  const start = new Date('2026-08-01T00:00:00.000Z');

  it('compares offset timestamps by instant instead of source text', () => {
    expect(activityTimestampOnOrAfter('2026-08-01T01:00:00+14:00', start)).toBe(false);
    expect(activityTimestampOnOrAfter('2026-07-31T23:30:00-05:00', start)).toBe(true);
  });

  it('rejects malformed timestamps and invalid range starts', () => {
    expect(activityTimestampOnOrAfter('not-a-date', start)).toBe(false);
    expect(activityTimestampOnOrAfter('2026-08-01T12:00:00Z', new Date('invalid'))).toBe(false);
  });
});

describe('activityScores', () => {
  const empty = { tasks: [], checks: [], journals: [], workLogs: [] };

  it('keys every contribution by its local calendar day', () => {
    const scores = activityScores({
      ...empty,
      checks: [{ date: '2026-08-24' }],
      journals: [{ date: '2026-08-24' }],
    });

    expect(scores.get('2026-08-24')).toBe(5);
  });

  it('resolves a stored timestamp to the day the heatmap renders', () => {
    // routineChecks.date and journalEntries.date are meant to be date-only, but
    // fromRow casts synced rows without validating. Keying on the raw string
    // produced a key aggregateActivity never looks up, losing the day entirely.
    const day = '2026-08-24';
    const timestamp = `${day}T13:30:00`;
    const scores = activityScores({ ...empty, checks: [{ date: timestamp }] });

    expect([...scores.keys()]).toEqual([day]);
    expect(scores.get(day)).toBe(2);
  });

  it('skips contributions whose day cannot be resolved', () => {
    const scores = activityScores({
      ...empty,
      checks: [{ date: 'not-a-date' }],
      journals: [{ date: '2026-02-30' }],
    });

    expect(scores.size).toBe(0);
  });

  it('ignores a work log whose stored minutes are unusable', () => {
    const scores = activityScores({
      ...empty,
      workLogs: [
        { at: '2026-08-24T09:00:00', minutes: 60 },
        { at: '2026-08-24T11:00:00', minutes: Number.NaN as number },
      ],
    });

    expect(scores.get('2026-08-24')).toBe(1);
  });
});

const dayOffset = (days: number): Date => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
};

beforeEach(() => {
  Object.assign(rows(), { tasks: [], routineChecks: [], journalEntries: [], workLogs: [] });
});

describe('loadActivity', () => {
  it('returns one dense entry per requested day, ending today', async () => {
    const days = await loadActivity(3);
    expect(days.map((d) => d.date)).toEqual([
      isoDay(dayOffset(-2)),
      isoDay(dayOffset(-1)),
      isoDay(dayOffset(0)),
    ]);
    expect(days.every((d) => d.count === 0 && d.level === 0)).toBe(true);
  });

  it('clamps a non-finite day count to the 365-day default', async () => {
    expect(await loadActivity(Number.NaN)).toHaveLength(365);
  });

  it('scores only completed, undeleted tasks', async () => {
    rows().tasks = [
      { status: 'done', completedAt: dayOffset(0).toISOString() },
      {
        status: 'done',
        completedAt: dayOffset(0).toISOString(),
        deletedAt: '2026-01-01T00:00:00Z',
      },
      { status: 'todo', completedAt: dayOffset(0).toISOString() },
    ];
    const today = (await loadActivity(2)).at(-1);
    expect(today).toEqual({ date: isoDay(dayOffset(0)), count: 1, level: 1 });
  });

  it('resolves a routine check stored as a timestamp to its local day', async () => {
    // routineChecks.date is meant to be date-only, but a synced row reaches
    // Dexie through fromRow without validation. The day must still match a grid
    // cell instead of vanishing from the heatmap.
    rows().routineChecks = [{ done: true, date: dayOffset(0).toISOString() }];
    const today = (await loadActivity(2)).at(-1);
    expect(today).toEqual({ date: isoDay(dayOffset(0)), count: 2, level: 1 });
  });

  it('skips rows whose date cannot be resolved to a day', async () => {
    rows().routineChecks = [{ done: true, date: 'not-a-date' }];
    rows().journalEntries = [{ date: 'not-a-date' }];
    expect((await loadActivity(2)).every((d) => d.count === 0)).toBe(true);
  });

  it('excludes activity that falls before the window', async () => {
    rows().journalEntries = [{ date: isoDay(dayOffset(-5)) }];
    rows().workLogs = [{ at: dayOffset(-5).toISOString(), minutes: 60 }];
    expect((await loadActivity(2)).every((d) => d.count === 0)).toBe(true);
  });

  it('weights work-log minutes per half hour', async () => {
    rows().workLogs = [{ at: dayOffset(0).toISOString(), minutes: 120 }];
    const today = (await loadActivity(2)).at(-1);
    expect(today).toEqual({ date: isoDay(dayOffset(0)), count: 2, level: 1 });
  });
});
