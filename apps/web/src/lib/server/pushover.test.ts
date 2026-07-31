import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendPushover } from './pushover';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('sendPushover', () => {
  it('rejects a blank message before contacting Pushover', async () => {
    vi.stubEnv('PUSHOVER_TOKEN', 'token');
    vi.stubEnv('PUSHOVER_USER', 'user');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    await expect(sendPushover({ message: '   ' })).resolves.toEqual({
      ok: false,
      reason: 'empty-message',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('trims and bounds text sent to the provider', async () => {
    vi.stubEnv('PUSHOVER_TOKEN', 'token');
    vi.stubEnv('PUSHOVER_USER', 'user');
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetch);

    await sendPushover({ message: `  ${'x'.repeat(1100)}  `, title: '  Alert  ' });

    const body = fetch.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(body.get('message')).toHaveLength(1024);
    expect(body.get('title')).toBe('Alert');
  });
});
