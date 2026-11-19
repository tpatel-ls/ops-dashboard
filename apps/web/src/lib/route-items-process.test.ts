import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createCapture: vi.fn(),
  addTask: vi.fn(),
  fetchWithTimeout: vi.fn(),
  toggleRoutineCheck: vi.fn(),
  routines: [] as object[],
}));

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>('@ops-dashboard/core');
  const emptyQuery = { filter: () => ({ toArray: async () => [] }) };
  const routineQuery = {
    filter: (keep: (routine: object) => boolean) => ({
      toArray: async () => mocks.routines.filter(keep),
    }),
  };
  return {
    ...actual,
    getDb: () => ({ projects: emptyQuery, routines: routineQuery }),
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
vi.mock('./routines', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./routines')>()),
  toggleRoutineCheck: mocks.toggleRoutineCheck,
}));

import { MAX_BRAIN_DUMP_TEXT_LENGTH } from './brain-dump-result';
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

  it('sends a dump longer than the route limit in pieces so no line is lost', async () => {
    mocks.fetchWithTimeout.mockReset();
    mocks.fetchWithTimeout.mockImplementation(
      async () =>
        new Response(JSON.stringify({ ok: true, items: [{ kind: 'task', title: 'Item' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    mocks.createCapture.mockReset();
    mocks.createCapture.mockRejectedValue(new Error('storage unavailable'));
    const lines = Array.from({ length: 30 }, (_, index) => `line ${index} ${'x'.repeat(400)}`);

    await processBrainDump(lines.join('\n'), 'notepad');

    const sent = mocks.fetchWithTimeout.mock.calls.map(
      ([, init]) => (JSON.parse((init as RequestInit).body as string) as { text: string }).text,
    );
    expect(sent.length).toBeGreaterThan(1);
    for (const text of sent) {
      expect(Array.from(text).length).toBeLessThanOrEqual(MAX_BRAIN_DUMP_TEXT_LENGTH);
    }
    expect(sent.flatMap((text) => text.split('\n'))).toEqual(lines);
  });

  it('captures every line of a long offline dump as a task', async () => {
    mocks.fetchWithTimeout.mockReset();
    mocks.fetchWithTimeout.mockRejectedValue(new TypeError('offline'));
    mocks.createCapture.mockReset();
    mocks.createCapture.mockImplementation(async () => ({ id: 'capture' }));
    mocks.addTask.mockReset();
    mocks.addTask.mockImplementation(async (title: string) => ({ id: title, title }));
    const lines = Array.from({ length: 150 }, (_, index) => `task ${index}`);

    const results = await processBrainDump(lines.join('\n'), 'notepad');

    expect(results.map((result) => result.title)).toEqual(lines);
  });
});

describe('processBrainDump habit routing', () => {
  it('routes a habit for a finished fixed routine to a task instead of failing', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 19, 9));
    mocks.routines = [
      {
        id: 'c25k',
        name: 'Couch to 5k',
        kind: 'fixed',
        durationDays: 30,
        startDate: '2026-09-01',
        endDate: '2026-09-30',
      },
    ];
    mocks.fetchWithTimeout.mockReset();
    mocks.fetchWithTimeout.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          items: [{ kind: 'habit', title: 'Couch to 5k', routineName: 'Couch to 5k' }],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    mocks.createCapture.mockReset();
    mocks.createCapture.mockResolvedValue({ id: 'capture' });
    mocks.addTask.mockReset();
    mocks.addTask.mockImplementation(async (title: string) => ({ id: 'task', title }));

    try {
      const results = await processBrainDump('Did couch to 5k', 'text');

      expect(mocks.toggleRoutineCheck).not.toHaveBeenCalled();
      expect(mocks.addTask).toHaveBeenCalledOnce();
      expect(results).toHaveLength(1);
    } finally {
      vi.useRealTimers();
      mocks.routines = [];
    }
  });
});
