import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  newRecord: vi.fn((fields: Record<string, unknown>) => fields),
  putRecord: vi.fn(async (_table: string, record: unknown) => record),
  patchRecord: vi.fn(),
  getRoutine: vi.fn(),
  listRoutineChecks: vi.fn(),
  findRoutineCheck: vi.fn(),
}));

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>('@ops-dashboard/core');
  return {
    ...actual,
    getDb: () => ({
      routines: { get: mocks.getRoutine },
      routineChecks: {
        where: mocks.findRoutineCheck.mockReturnValue({
          equals: () => ({ toArray: mocks.listRoutineChecks }),
        }),
      },
    }),
  };
});

vi.mock('./records', () => ({
  newRecord: mocks.newRecord,
  putRecord: mocks.putRecord,
  patchRecord: mocks.patchRecord,
  softDeleteRecord: vi.fn(),
}));

import {
  addDaysISO,
  computeStreak,
  createRoutine,
  isRoutineDoneOn,
  fixedRoutineDuration,
  toggleRoutineCheck,
  updateRoutine,
} from './routines';

describe('createRoutine', () => {
  beforeEach(() => {
    mocks.newRecord.mockClear();
    mocks.putRecord.mockClear();
    mocks.patchRecord.mockClear();
    mocks.getRoutine.mockReset().mockResolvedValue({
      id: 'routine-1',
      name: 'Reset',
      kind: 'fixed',
      durationDays: 30,
      startDate: '2026-08-01',
    });
  });

  it.each([0, -2, 1.5])('rejects an invalid duration: %s', (durationDays) => {
    expect(() => createRoutine({ name: 'Reset', durationDays })).toThrow(
      'Routine duration must be a positive whole number of days',
    );
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });

  it('requires a name and trims it before storage', async () => {
    expect(() => createRoutine({ name: '   ' })).toThrow('Routine name is required');
    await expect(createRoutine({ name: '  Morning reset  ' })).resolves.toMatchObject({
      name: 'Morning reset',
    });
  });

  it('includes both endpoints in a fixed routine duration', async () => {
    const routine = await createRoutine({
      name: 'Reset',
      kind: 'fixed',
      durationDays: 2,
      startDate: '2026-07-31',
    });

    expect(routine).toMatchObject({ startDate: '2026-07-31', endDate: '2026-08-01' });
  });

  it('requires durations only for fixed routines', async () => {
    expect(() => createRoutine({ name: 'Reset', kind: 'fixed' })).toThrow(
      'Fixed routines require a duration',
    );
    await expect(
      createRoutine({ name: 'Daily reset', kind: 'ongoing', durationDays: 30 }),
    ).resolves.not.toHaveProperty('durationDays');
  });

  it.each(['2026-02-30', 'not-a-date'])('rejects an invalid start date: %s', (startDate) => {
    expect(() => createRoutine({ name: 'Reset', startDate })).toThrow(
      'Routine start date must be a valid calendar day',
    );
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });

  it('validates and trims a specific reminder time', async () => {
    await expect(createRoutine({ name: 'Reset', specificTime: ' 08:05 ' })).resolves.toMatchObject({
      specificTime: '08:05',
    });
    expect(() => createRoutine({ name: 'Reset', specificTime: '25:00' })).toThrow(
      'Routine time must use 24-hour HH:mm format',
    );
  });
});

describe('updateRoutine', () => {
  beforeEach(() => {
    mocks.getRoutine.mockReset().mockResolvedValue({
      id: 'routine-1',
      name: 'Reset',
      kind: 'fixed',
      durationDays: 30,
      startDate: '2026-08-01',
    });
  });

  it('validates and normalizes editable fields', async () => {
    await updateRoutine('routine-1', {
      name: '  Morning reset  ',
      description: '   ',
      specificTime: ' 08:05 ',
    });

    expect(mocks.patchRecord).toHaveBeenCalledWith('routines', 'routine-1', {
      name: 'Morning reset',
      description: undefined,
      specificTime: '08:05',
    });
    expect(() => updateRoutine('routine-1', { startDate: '2026-02-30' })).toThrow(
      'Routine start date must be a valid calendar day',
    );
    expect(() => updateRoutine('routine-1', { kind: 'temporary' as never })).toThrow(
      'Routine kind must be valid',
    );
    expect(() => updateRoutine('routine-1', { startDate: undefined } as never)).toThrow(
      'Routine start date must be a valid calendar day',
    );
  });

  it('refuses to derive an end date from an unusable stored duration', async () => {
    mocks.getRoutine.mockResolvedValue({
      id: 'routine-1',
      name: 'Reset',
      kind: 'fixed',
      // A synced row reaches Dexie through fromRow, which casts without
      // validating. -5 used to yield an endDate before startDate.
      durationDays: -5,
      startDate: '2026-08-01',
    });
    mocks.patchRecord.mockClear();

    await expect(updateRoutine('routine-1', { startDate: '2026-08-10' })).rejects.toThrow(
      'Fixed routines require a duration.',
    );
    expect(mocks.patchRecord).not.toHaveBeenCalled();
  });

  it('keeps derived fixed-routine dates consistent', async () => {
    await updateRoutine('routine-1', { startDate: '2026-08-10', durationDays: 3 });
    expect(mocks.patchRecord).toHaveBeenCalledWith(
      'routines',
      'routine-1',
      expect.objectContaining({
        startDate: '2026-08-10',
        durationDays: 3,
        endDate: '2026-08-12',
      }),
    );

    await updateRoutine('routine-1', { kind: 'ongoing' });
    expect(mocks.patchRecord).toHaveBeenLastCalledWith(
      'routines',
      'routine-1',
      expect.objectContaining({ kind: 'ongoing', durationDays: undefined, endDate: undefined }),
    );
  });
});

describe('toggleRoutineCheck', () => {
  beforeEach(() => {
    mocks.getRoutine.mockReset().mockResolvedValue({
      id: 'routine-1',
      name: 'Reset',
      startDate: '2026-08-01',
    });
    mocks.listRoutineChecks.mockReset().mockResolvedValue([]);
    mocks.findRoutineCheck.mockClear();
    mocks.putRecord.mockClear();
    mocks.patchRecord.mockClear();
  });

  it.each(['2026-02-30', 'not-a-date'])('rejects an invalid check date: %s', async (date) => {
    await expect(toggleRoutineCheck('routine-1', date, true)).rejects.toThrow(
      'Routine check date must be a valid calendar day',
    );
  });

  it('rejects malformed runtime metadata before opening the database', async () => {
    await expect(toggleRoutineCheck('   ', '2026-08-18', true)).rejects.toThrow(
      'Routine check target must be valid',
    );
    await expect(toggleRoutineCheck('routine-1', '2026-08-18', 'yes' as never)).rejects.toThrow(
      'Routine check state must be boolean',
    );
    await expect(
      toggleRoutineCheck('routine-1', '2026-08-18', true, 'sync' as never),
    ).rejects.toThrow('Routine check source must be valid');
  });

  it.each([
    undefined,
    { deletedAt: '2026-08-25T12:00:00.000Z' },
    { archivedAt: '2026-08-25T12:00:00.000Z' },
  ])('rejects unavailable routine targets', async (routine) => {
    mocks.getRoutine.mockResolvedValue(routine);

    await expect(toggleRoutineCheck('routine-1', '2026-08-25', true)).rejects.toThrow(
      'Routine is not available for check-ins',
    );
    expect(mocks.findRoutineCheck).not.toHaveBeenCalled();
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });

  it('rejects check-ins outside the routine schedule', async () => {
    mocks.getRoutine.mockResolvedValue({
      id: 'routine-1',
      name: 'Reset',
      startDate: '2026-08-10',
      endDate: '2026-08-20',
    });

    await expect(toggleRoutineCheck('routine-1', '2026-08-09', true)).rejects.toThrow(
      'Routine is not active on this date',
    );
    await expect(toggleRoutineCheck('routine-1', '2026-08-21', true)).rejects.toThrow(
      'Routine is not active on this date',
    );
    expect(mocks.findRoutineCheck).not.toHaveBeenCalled();
  });

  it('accepts a check-in when the stored schedule arrived as an instant', async () => {
    // fromRow casts synced rows without validating, so a routine can reach
    // Dexie with its bounds stored as timestamps rather than calendar days.
    mocks.getRoutine.mockResolvedValue({
      id: 'routine-1',
      name: 'Reset',
      startDate: '2026-08-10T00:00:00.000-05:00',
      endDate: '2026-08-20T23:00:00.000-05:00',
    });

    await toggleRoutineCheck('routine-1', '2026-08-15', true);

    expect(mocks.putRecord).toHaveBeenCalledWith(
      'routineChecks',
      expect.objectContaining({ routineId: 'routine-1', date: '2026-08-15', done: true }),
    );
  });

  it('still rejects a routine whose stored start day cannot be resolved', async () => {
    mocks.getRoutine.mockResolvedValue({
      id: 'routine-1',
      name: 'Reset',
      startDate: 'not-a-date',
    });

    await expect(toggleRoutineCheck('routine-1', '2026-08-15', true)).rejects.toThrow(
      'Routine is not active on this date',
    );
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });

  it('creates a live check when only a deleted check matches the day', async () => {
    mocks.listRoutineChecks.mockResolvedValue([
      {
        id: 'deleted-check',
        routineId: 'routine-1',
        date: '2026-08-25',
        done: true,
        deletedAt: '2026-08-25T12:00:00.000Z',
      },
    ]);

    await toggleRoutineCheck('routine-1', '2026-08-25', true);

    expect(mocks.patchRecord).not.toHaveBeenCalled();
    expect(mocks.putRecord).toHaveBeenCalledWith(
      'routineChecks',
      expect.objectContaining({ routineId: 'routine-1', date: '2026-08-25', done: true }),
    );
  });
});

describe('addDaysISO', () => {
  it('rejects date calculations outside the JavaScript date range', () => {
    expect(() => addDaysISO('2026-08-09', Number.MAX_SAFE_INTEGER)).toThrow(
      'Routine date calculation is out of range',
    );
  });
});

describe('computeStreak', () => {
  it('ignores malformed synced checks and rejects an invalid anchor day', () => {
    const checks = [
      { id: 'bad', date: 'not-a-date', done: true },
      { id: 'today', date: '2026-08-20', done: true },
      { id: 'yesterday', date: '2026-08-19', done: true },
    ] as never;

    expect(computeStreak(checks, '2026-08-20')).toBe(2);
    expect(computeStreak(checks, '2026-02-30')).toBe(0);
  });

  it('counts a check whose day arrived as a timestamp', () => {
    // `fromRow` casts a synced row without validating, so a check can reach
    // Dexie carrying an instant instead of a date-only day. Discarding it cut
    // the streak short at that day.
    const checks = [
      { id: 'today', date: '2026-08-20', done: true },
      { id: 'yesterday', date: new Date(2026, 7, 19, 12, 0, 0).toISOString(), done: true },
      { id: 'two-days-ago', date: '2026-08-18', done: true },
    ] as never;

    expect(computeStreak(checks, '2026-08-20')).toBe(3);
  });
});

describe('isRoutineDoneOn', () => {
  const day = '2026-08-20';

  it('reads a check stored as a date-only day', () => {
    const checks = [{ id: 'c', routineId: 'r', date: day, done: true }] as never;
    expect(isRoutineDoneOn(checks, 'r', day)).toBe(true);
  });

  it('reads a check whose day arrived as a timestamp', () => {
    // Synced rows are cast without validating, so `date` can be an instant.
    // An exact string compare missed it and the routine read as not done.
    const checks = [
      { id: 'c', routineId: 'r', date: new Date(2026, 7, 20, 9, 30, 0).toISOString(), done: true },
    ] as never;
    expect(isRoutineDoneOn(checks, 'r', day)).toBe(true);
  });

  it('ignores another routine, another day, and an undone or deleted check', () => {
    const checks = [
      { id: 'other-routine', routineId: 'other', date: day, done: true },
      { id: 'other-day', routineId: 'r', date: '2026-08-19', done: true },
      { id: 'undone', routineId: 'r', date: day, done: false },
      { id: 'deleted', routineId: 'r', date: day, done: true, deletedAt: '2026-08-20T10:00:00Z' },
    ] as never;
    expect(isRoutineDoneOn(checks, 'r', day)).toBe(false);
  });
});

describe('fixedRoutineDuration', () => {
  it('reports the length of a valid fixed routine', () => {
    expect(fixedRoutineDuration({ kind: 'fixed', durationDays: 30 })).toBe(30);
    expect(fixedRoutineDuration({ kind: 'fixed', durationDays: 1 })).toBe(1);
  });

  it('has no length for an ongoing routine', () => {
    expect(fixedRoutineDuration({ kind: 'ongoing', durationDays: 30 })).toBeUndefined();
    expect(fixedRoutineDuration({ kind: 'fixed', durationDays: undefined })).toBeUndefined();
  });

  it('rejects a synced duration createRoutine would never have stored', () => {
    // A truthiness test let these through and the badge rendered "day -5 / -5".
    expect(fixedRoutineDuration({ kind: 'fixed', durationDays: -5 })).toBeUndefined();
    expect(fixedRoutineDuration({ kind: 'fixed', durationDays: 0 })).toBeUndefined();
    expect(fixedRoutineDuration({ kind: 'fixed', durationDays: 2.5 })).toBeUndefined();
    expect(fixedRoutineDuration({ kind: 'fixed', durationDays: Number.NaN })).toBeUndefined();
    expect(
      fixedRoutineDuration({ kind: 'fixed', durationDays: '30' as unknown as number }),
    ).toBeUndefined();
  });
});
