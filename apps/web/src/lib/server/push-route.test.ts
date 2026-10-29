import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('@/lib/server/guard', () => ({ requestAllowed: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/server/pushover', () => ({ sendPushover: mocks.send }));

import { POST } from '../../app/api/push/route';

function pushRequest(body: string): Request {
  return new Request('https://dashboard.example/api/push', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
}

afterEach(() => {
  mocks.send.mockReset();
});

describe('push API request body', () => {
  it.each(['null', '"text"', '42', 'not json'])('rejects a %s body as empty', async (body) => {
    const response = await POST(pushRequest(body));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, reason: 'empty' });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('sends a valid message with an emergency priority clamped to normal', async () => {
    mocks.send.mockResolvedValue({ ok: true });

    const response = await POST(
      pushRequest(JSON.stringify({ message: ' Ping ', title: 'Ops', priority: 2 })),
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.send).toHaveBeenCalledWith({ message: 'Ping', title: 'Ops', priority: 0 });
  });
});
