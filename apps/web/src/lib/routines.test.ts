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
});
