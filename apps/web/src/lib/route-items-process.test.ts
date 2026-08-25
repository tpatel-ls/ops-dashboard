import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createCapture: vi.fn(),
  addTask: vi.fn(),
  fetchWithTimeout: vi.fn(),
}));

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>('@ops-dashboard/core');
  const emptyQuery = { filter: () => ({ toArray: async () => [] }) };
  return {
    ...actual,
    getDb: () => ({ projects: emptyQuery, routines: emptyQuery }),
  };
});

vi.mock('./captures', () => ({
  createCapture: mocks.createCapture,
  dismissCapture: vi.fn(),
  setCaptureRoute: vi.fn(),
}));
vi.mock('./tasks', () => ({
  addTask: mocks.addTask,
  addTaskToProject: vi.fn(),
  softDeleteTask: vi.fn(),
}));
vi.mock('./fetch-timeout', () => ({ fetchWithTimeout: mocks.fetchWithTimeout }));

import { processBrainDump } from './route-items';

describe('processBrainDump failure recovery', () => {
  it('does not replay accepted AI items after routing fails', async () => {
    mocks.fetchWithTimeout.mockResolvedValue(
      new Response(
        JSON.stringify({ ok: true, items: [{ kind: 'task', title: 'Call supplier' }] }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    mocks.createCapture.mockRejectedValue(new Error('storage unavailable'));

    await expect(processBrainDump('Call supplier', 'text')).resolves.toEqual([]);

    expect(mocks.createCapture).toHaveBeenCalledOnce();
    expect(mocks.addTask).not.toHaveBeenCalled();
  });
});
