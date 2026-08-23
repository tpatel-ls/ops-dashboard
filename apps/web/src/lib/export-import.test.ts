import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  bulkPutTasks: vi.fn(),
  bulkPutProjects: vi.fn(),
  bulkPutWhiteboards: vi.fn(),
  enqueueOp: vi.fn(),
}));

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>('@ops-dashboard/core');
  const tasks = { bulkPut: mocks.bulkPutTasks };
  const projects = { bulkPut: mocks.bulkPutProjects };
  const whiteboards = { bulkPut: mocks.bulkPutWhiteboards };
  return {
    ...actual,
    getDb: () => ({
      tasks,
      projects,
      whiteboards,
      transaction: async (_mode: string, ...args: unknown[]) => {
        const work = args.at(-1) as () => Promise<void>;
        await work();
      },
    }),
  };
});

vi.mock('./sync-queue', () => ({ enqueueOp: mocks.enqueueOp }));

import { importAll } from './export';

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
      payload: task,
    });
  });
});
