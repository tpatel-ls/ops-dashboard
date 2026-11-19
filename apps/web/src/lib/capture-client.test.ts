import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  processBrainDump: vi.fn(),
  pushNotification: vi.fn(),
}));

vi.mock('@/lib/route-items', () => ({ processBrainDump: mocks.processBrainDump }));
vi.mock('@/lib/feed', () => ({ pushNotification: mocks.pushNotification }));

import { runCapture } from './capture-client';

describe('runCapture', () => {
  it('returns the captured record when feed notification storage fails', async () => {
    mocks.processBrainDump.mockResolvedValue([
      { kind: 'task', title: 'Call Alex', recordId: 'task-1' },
    ]);
    mocks.pushNotification.mockRejectedValue(new Error('storage unavailable'));

    await expect(runCapture('Call Alex')).resolves.toEqual({ kind: 'task', id: 'task-1' });
    expect(mocks.pushNotification).toHaveBeenCalledOnce();
  });

  it('keeps a long captured title within the notification limit', async () => {
    mocks.pushNotification.mockReset();
    mocks.pushNotification.mockImplementation((input: { title: string }) => {
      // Mirrors the real title check, which throws synchronously.
      if (Array.from(input.title).length > 200) {
        throw new Error('Notification title must contain at most 200 characters.');
      }
      return Promise.resolve({});
    });
    const title = 'Plan the launch '.repeat(30).trim();
    mocks.processBrainDump.mockResolvedValue([{ kind: 'task', title, recordId: 'task-2' }]);

    await expect(runCapture(title)).resolves.toEqual({ kind: 'task', id: 'task-2' });
    const sent = mocks.pushNotification.mock.calls[0]![0] as { title: string };
    expect(Array.from(sent.title).length).toBeLessThanOrEqual(200);
    expect(sent.title.startsWith('Captured: Plan the launch')).toBe(true);
  });

  it('still returns the record when a notification throws synchronously', async () => {
    mocks.pushNotification.mockReset();
    mocks.pushNotification.mockImplementation(() => {
      throw new Error('Notification kind must be valid.');
    });
    mocks.processBrainDump.mockResolvedValue([
      { kind: 'task', title: 'Call Alex', recordId: 'task-3' },
    ]);

    await expect(runCapture('Call Alex')).resolves.toEqual({ kind: 'task', id: 'task-3' });
  });
});
