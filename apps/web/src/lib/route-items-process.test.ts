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
