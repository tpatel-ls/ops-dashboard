import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  bulkPutTasks: vi.fn(),
  bulkPutProjects: vi.fn(),
  bulkPutWhiteboards: vi.fn(),
  enqueueOp: vi.fn(),
  transactionTables: [] as unknown[],
  // The copies this device already holds, by id.
  local: new Map<string, { version: number }>(),
}));

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>('@ops-dashboard/core');
  const bulkGet = async (ids: string[]) => ids.map((id) => mocks.local.get(id));
  const tasks = { bulkPut: mocks.bulkPutTasks, bulkGet };
  const projects = { bulkPut: mocks.bulkPutProjects, bulkGet };
  const whiteboards = { bulkPut: mocks.bulkPutWhiteboards, bulkGet };
  const syncOps = {};
  return {
    ...actual,
    getDb: () => ({
      tasks,
      projects,
      whiteboards,
      syncOps,
      transaction: async (_mode: string, ...args: unknown[]) => {
        mocks.transactionTables = args.slice(0, -1);
        const work = args.at(-1) as () => Promise<void>;
        await work();
      },
    }),
  };
});

vi.mock('./sync-queue', () => ({ enqueueOp: mocks.enqueueOp }));

import { importAll } from './export';

const restored = { version: 2, updatedAt: expect.not.stringMatching(/^2026-08-01/) };

const metadata = {
  createdAt: '2026-08-01T12:00:00.000Z',
  updatedAt: '2026-08-01T12:00:00.000Z',
  version: 1,
  deviceId: 'backup',
};

describe('importAll', () => {
  it('queues restored records so they sync to other devices', async () => {
    const task = {
      ...metadata,
      id: 'task-1',
      title: 'Restored task',
      status: 'todo',
      priority: 0,
      tags: [],
      reminders: [],
      checklist: [],
      order: 1,
    };
    const project = {
      ...metadata,
      id: 'project-1',
      name: 'Restored project',
      color: '#fff',
      kind: 'project',
      status: 'active',
      milestones: [],
      checklists: [],
    };
    const whiteboard = {
      ...metadata,
      id: 'board-1',
      name: 'Restored board',
      document: null,
      linkedTaskIds: [],
    };

    await importAll({
      version: 1,
      exportedAt: '2026-08-23T12:00:00.000Z',
      tasks: [task],
      projects: [project],
      whiteboards: [whiteboard],
    });

    expect(mocks.enqueueOp).toHaveBeenCalledTimes(3);
    expect(mocks.enqueueOp).toHaveBeenCalledWith({
      table: 'tasks',
      recordId: 'task-1',
      op: 'put',
      payload: { ...task, ...restored },
    });
    expect(mocks.transactionTables).toHaveLength(4);
  });

  it('restores a blank board from an older export with a non-null document', async () => {
    mocks.enqueueOp.mockClear();
    const board = {
      ...metadata,
      id: 'board-2',
      name: 'Blank board',
      document: null,
      linkedTaskIds: [],
    };

    await importAll({
      version: 1,
      exportedAt: '2026-08-23T12:00:00.000Z',
      tasks: [],
      projects: [],
      whiteboards: [board],
    });

    expect(mocks.bulkPutWhiteboards).toHaveBeenLastCalledWith([
      { ...board, ...restored, document: {} },
    ]);
    expect(mocks.enqueueOp).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { ...board, ...restored, document: {} } }),
    );
  });

  it('stamps a restored record above the newer copy this device holds', async () => {
    // The server's sync guard keeps its own row against a lower version, so a
    // backup's older version never reached other devices.
    mocks.enqueueOp.mockClear();
    mocks.local.set('task-3', { version: 7 });
    const task = {
      ...metadata,
      id: 'task-3',
      title: 'Restored over a newer edit',
      status: 'todo',
      priority: 0,
      tags: [],
      reminders: [],
      checklist: [],
      order: 1,
    };
    try {
      await importAll({
        version: 1,
        exportedAt: '2026-08-23T12:00:00.000Z',
        tasks: [task],
        projects: [],
        whiteboards: [],
      });
    } finally {
      mocks.local.clear();
    }

    const written = mocks.bulkPutTasks.mock.lastCall![0][0];
    expect(written).toMatchObject({ title: 'Restored over a newer edit', version: 8 });
    expect(Date.parse(written.updatedAt)).toBeGreaterThan(Date.parse(metadata.updatedAt));
    expect(mocks.enqueueOp).toHaveBeenCalledWith(expect.objectContaining({ payload: written }));
  });
});
