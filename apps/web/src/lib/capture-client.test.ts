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
});
