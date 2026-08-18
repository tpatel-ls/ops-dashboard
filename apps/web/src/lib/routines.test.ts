import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  newRecord: vi.fn((fields: Record<string, unknown>) => fields),
  putRecord: vi.fn(async (_table: string, record: unknown) => record),
  patchRecord: vi.fn(),
}));

vi.mock('./records', () => ({
  newRecord: mocks.newRecord,
  putRecord: mocks.putRecord,
  patchRecord: mocks.patchRecord,
  softDeleteRecord: vi.fn(),
}));

import { addDaysISO, createRoutine, toggleRoutineCheck, updateRoutine } from './routines';

describe('createRoutine', () => {
  beforeEach(() => {
    mocks.newRecord.mockClear();
    mocks.putRecord.mockClear();
    mocks.patchRecord.mockClear();
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
});

describe('toggleRoutineCheck', () => {
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
});

describe('addDaysISO', () => {
  it('rejects date calculations outside the JavaScript date range', () => {
    expect(() => addDaysISO('2026-08-09', Number.MAX_SAFE_INTEGER)).toThrow(
      'Routine date calculation is out of range',
    );
  });
});
