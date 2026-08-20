import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getProject: vi.fn(),
  getWorkLog: vi.fn(),
  listProjectWorkLogs: vi.fn(),
  newRecord: vi.fn((fields: Record<string, unknown>) => ({
    ...fields,
    id: 'work-log-test',
    createdAt: '2026-07-15T12:00:00.000Z',
    updatedAt: '2026-07-15T12:00:00.000Z',
    version: 1,
    deviceId: 'device-test',
  })),
  putRecord: vi.fn(async (_table: string, record: unknown) => record),
  patchRecord: vi.fn(),
  softDeleteRecord: vi.fn(),
}));

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>('@ops-dashboard/core');
  return {
    ...actual,
    getDb: () => ({
      projects: { get: mocks.getProject },
      workLogs: {
        get: mocks.getWorkLog,
        where: () => ({ equals: () => ({ toArray: mocks.listProjectWorkLogs }) }),
      },
    }),
  };
});

vi.mock('./records', () => ({
  newRecord: mocks.newRecord,
  putRecord: mocks.putRecord,
  patchRecord: mocks.patchRecord,
  softDeleteRecord: mocks.softDeleteRecord,
}));

import { deleteWorkLog, logWork } from './worklogs';

describe('logWork', () => {
  beforeEach(() => {
    mocks.getProject.mockReset().mockResolvedValue({ id: 'project-1', status: 'active' });
    mocks.newRecord.mockClear();
    mocks.putRecord.mockClear();
    mocks.patchRecord.mockReset().mockResolvedValue(undefined);
    mocks.getWorkLog.mockReset();
    mocks.listProjectWorkLogs.mockReset().mockResolvedValue([]);
    mocks.softDeleteRecord.mockReset();
  });

  it.each([0, -5, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid minutes before writing: %s',
    async (minutes) => {
      await expect(logWork('project-1', minutes)).rejects.toThrow(
        'Work log minutes must be a positive integer',
      );
      expect(mocks.putRecord).not.toHaveBeenCalled();
    },
  );

  it.each(['', 'not-a-date'])('rejects an invalid work time before writing: %s', async (at) => {
    await expect(logWork('project-1', 30, undefined, at)).rejects.toThrow(
      'Work log time must be a valid date',
    );
    expect(mocks.getProject).not.toHaveBeenCalled();
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });

  it('rejects logs for missing projects', async () => {
    mocks.getProject.mockResolvedValue(undefined);

    await expect(logWork('missing', 30)).rejects.toThrow('Project is not available');
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });

  it('rejects logs for inactive projects', async () => {
    mocks.getProject.mockResolvedValue({ id: 'project-1', status: 'active', archivedAt: 'now' });

    await expect(logWork('project-1', 30)).rejects.toThrow('Project is not available');
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });

  it('writes a valid log and stamps the project', async () => {
    const log = await logWork(
      'project-1',
      30,
      '  Moved launch forward  ',
      '2026-07-15T12:00:00.000Z',
    );

    expect(log).toMatchObject({
      projectId: 'project-1',
      minutes: 30,
      note: 'Moved launch forward',
    });
    expect(mocks.putRecord).toHaveBeenCalledWith(
      'workLogs',
      expect.objectContaining({ minutes: 30 }),
    );
    expect(mocks.patchRecord).toHaveBeenCalledWith('projects', 'project-1', {
      lastWorkedAt: '2026-07-15T12:00:00.000Z',
    });
  });

  it('omits notes that contain only whitespace', async () => {
    const log = await logWork('project-1', 30, '   ', '2026-07-15T12:00:00.000Z');

    expect(log).not.toHaveProperty('note');
  });

  it('stores supplied timestamps in canonical UTC form', async () => {
    const log = await logWork('project-1', 30, undefined, '2026-07-15T07:00:00-05:00');

    expect(log.at).toBe('2026-07-15T12:00:00.000Z');
    expect(mocks.patchRecord).toHaveBeenCalledWith('projects', 'project-1', {
      lastWorkedAt: '2026-07-15T12:00:00.000Z',
    });
  });

  it('does not move project activity backward for a backdated log', async () => {
    mocks.getProject.mockResolvedValue({
      id: 'project-1',
      status: 'active',
      lastWorkedAt: '2026-07-20T12:00:00.000Z',
    });

    await logWork('project-1', 30, undefined, '2026-07-15T12:00:00.000Z');

    expect(mocks.putRecord).toHaveBeenCalled();
    expect(mocks.patchRecord).not.toHaveBeenCalled();
  });

  it('repairs malformed project activity with a valid log time', async () => {
    mocks.getProject.mockResolvedValue({
      id: 'project-1',
      status: 'active',
      lastWorkedAt: 'not-a-date',
    });

    await logWork('project-1', 30, undefined, '2026-07-15T12:00:00.000Z');

    expect(mocks.patchRecord).toHaveBeenCalledWith('projects', 'project-1', {
      lastWorkedAt: '2026-07-15T12:00:00.000Z',
    });
  });
});

describe('deleteWorkLog', () => {
  it('restores the previous project activity timestamp when the latest log is deleted', async () => {
    const latest = {
      id: 'work-latest',
      projectId: 'project-1',
      at: '2026-08-02T12:00:00.000Z',
    };
    mocks.getWorkLog.mockResolvedValue(latest);
    mocks.getProject.mockResolvedValue({
      id: 'project-1',
      status: 'active',
      lastWorkedAt: latest.at,
    });
    mocks.listProjectWorkLogs.mockResolvedValue([
      latest,
      { id: 'work-previous', projectId: 'project-1', at: '2026-08-01T12:00:00.000Z' },
    ]);

    await deleteWorkLog(latest.id);

    expect(mocks.softDeleteRecord).toHaveBeenCalledWith('workLogs', latest.id);
    expect(mocks.patchRecord).toHaveBeenCalledWith('projects', 'project-1', {
      lastWorkedAt: '2026-08-01T12:00:00.000Z',
    });
  });

  it('ignores malformed legacy timestamps when restoring project activity', async () => {
    const latest = {
      id: 'work-latest',
      projectId: 'project-1',
      at: '2026-08-02T12:00:00.000Z',
    };
    mocks.getWorkLog.mockResolvedValue(latest);
    mocks.getProject.mockResolvedValue({
      id: 'project-1',
      status: 'active',
      lastWorkedAt: latest.at,
    });
    mocks.listProjectWorkLogs.mockResolvedValue([
      latest,
      { id: 'work-invalid', projectId: 'project-1', at: 'not-a-date' },
      { id: 'work-previous', projectId: 'project-1', at: '2026-08-01T12:00:00.000Z' },
    ]);

    await deleteWorkLog(latest.id);

    expect(mocks.patchRecord).toHaveBeenCalledWith('projects', 'project-1', {
      lastWorkedAt: '2026-08-01T12:00:00.000Z',
    });
  });
});
