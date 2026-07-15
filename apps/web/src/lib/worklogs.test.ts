import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getProject: vi.fn(),
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
}));

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>(
    '@ops-dashboard/core',
  );
  return {
    ...actual,
    getDb: () => ({ projects: { get: mocks.getProject } }),
  };
});

vi.mock('./records', () => ({
  newRecord: mocks.newRecord,
  putRecord: mocks.putRecord,
  patchRecord: mocks.patchRecord,
  softDeleteRecord: vi.fn(),
}));

import { logWork } from './worklogs';

describe('logWork', () => {
  beforeEach(() => {
    mocks.getProject.mockReset().mockResolvedValue({ id: 'project-1', status: 'active' });
    mocks.newRecord.mockClear();
    mocks.putRecord.mockClear();
    mocks.patchRecord.mockReset().mockResolvedValue(undefined);
  });

  it.each([0, -5, 1.5])('rejects invalid minutes before writing: %s', async (minutes) => {
    await expect(logWork('project-1', minutes)).rejects.toThrow(
      'Work log minutes must be a positive integer',
    );
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
    const log = await logWork('project-1', 30, 'Moved launch forward', '2026-07-15T12:00:00.000Z');

    expect(log).toMatchObject({ projectId: 'project-1', minutes: 30, note: 'Moved launch forward' });
    expect(mocks.putRecord).toHaveBeenCalledWith('workLogs', expect.objectContaining({ minutes: 30 }));
    expect(mocks.patchRecord).toHaveBeenCalledWith('projects', 'project-1', {
      lastWorkedAt: '2026-07-15T12:00:00.000Z',
    });
  });
});
