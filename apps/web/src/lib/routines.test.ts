import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  newRecord: vi.fn((fields: Record<string, unknown>) => fields),
  putRecord: vi.fn(async (_table: string, record: unknown) => record),
}));

vi.mock('./records', () => ({
  newRecord: mocks.newRecord,
  putRecord: mocks.putRecord,
  patchRecord: vi.fn(),
  softDeleteRecord: vi.fn(),
}));

import { createRoutine } from './routines';

describe('createRoutine', () => {
  beforeEach(() => {
    mocks.newRecord.mockClear();
    mocks.putRecord.mockClear();
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
