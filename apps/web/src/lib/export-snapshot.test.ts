import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  tasks: { toArray: vi.fn(async () => []) },
  projects: { toArray: vi.fn(async () => []) },
  whiteboards: { toArray: vi.fn(async () => []) },
}));

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>('@ops-dashboard/core');
  return {
    ...actual,
    getDb: () => ({
      tasks: mocks.tasks,
      projects: mocks.projects,
      whiteboards: mocks.whiteboards,
      transaction: mocks.transaction.mockImplementation(
        async (_mode: string, ...args: unknown[]) => {
          const work = args.at(-1) as () => Promise<unknown>;
          return work();
        },
      ),
    }),
  };
});

import { exportAll } from './export';

describe('exportAll', () => {
  it('reads related collections from one consistent database snapshot', async () => {
    await expect(exportAll()).resolves.toMatchObject({
      version: 1,
      tasks: [],
      projects: [],
      whiteboards: [],
    });

    expect(mocks.transaction).toHaveBeenCalledWith(
      'r',
      mocks.tasks,
      mocks.projects,
      mocks.whiteboards,
      expect.any(Function),
    );
  });
});
