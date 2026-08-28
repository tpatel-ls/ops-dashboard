import { afterEach, describe, expect, it, vi } from 'vitest';
import { PUSHOVER_TIMEOUT_MS, sendPushover } from './pushover';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('sendPushover', () => {
  it('treats whitespace-only provider credentials as unconfigured', async () => {
    vi.stubEnv('PUSHOVER_TOKEN', '   ');
    vi.stubEnv('PUSHOVER_USER', ' user ');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    await expect(sendPushover({ message: 'Alert' })).resolves.toEqual({
      ok: false,
      reason: 'not-configured',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('normalizes provider credentials before sending', async () => {
    vi.stubEnv('PUSHOVER_TOKEN', ' token ');
    vi.stubEnv('PUSHOVER_USER', ' user ');
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetch);

    await sendPushover({ message: 'Alert' });

    const body = fetch.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(body.get('token')).toBe('token');
    expect(body.get('user')).toBe('user');
  });

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

  it('bounds supplementary links to the provider limits', async () => {
    vi.stubEnv('PUSHOVER_TOKEN', 'token');
    vi.stubEnv('PUSHOVER_USER', 'user');
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetch);

    await sendPushover({
      message: 'Alert',
      url: `  https://example.com/${'x'.repeat(600)}  `,
      urlTitle: `  ${'y'.repeat(120)}  `,
    });

    const body = fetch.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(body.get('url')).toHaveLength(512);
    expect(body.get('url_title')).toHaveLength(100);
  });

  it('rejects unsafe or relative provider links', async () => {
    vi.stubEnv('PUSHOVER_TOKEN', 'token');
    vi.stubEnv('PUSHOVER_USER', 'user');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    await expect(sendPushover({ message: 'Alert', url: 'javascript:alert(1)' })).resolves.toEqual({
      ok: false,
      reason: 'invalid-url',
    });
    await expect(sendPushover({ message: 'Alert', url: '/tasks' })).resolves.toEqual({
      ok: false,
      reason: 'invalid-url',
    });
    await expect(
      sendPushover({ message: 'Alert', url: 'https://user:secret@example.test/tasks' }),
    ).resolves.toEqual({
      ok: false,
      reason: 'invalid-url',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects invalid runtime priority values', async () => {
    vi.stubEnv('PUSHOVER_TOKEN', 'token');
    vi.stubEnv('PUSHOVER_USER', 'user');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    await expect(sendPushover({ message: 'Alert', priority: 3 as never })).resolves.toEqual({
      ok: false,
      reason: 'invalid-priority',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('omits a link title when no link is present', async () => {
    vi.stubEnv('PUSHOVER_TOKEN', 'token');
    vi.stubEnv('PUSHOVER_USER', 'user');
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetch);

    await sendPushover({ message: 'Alert', urlTitle: 'Open dashboard' });

    const body = fetch.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(body.has('url_title')).toBe(false);
  });

  it('does not split Unicode code points at provider limits', async () => {
    vi.stubEnv('PUSHOVER_TOKEN', 'token');
    vi.stubEnv('PUSHOVER_USER', 'user');
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetch);

    await sendPushover({ message: `${'x'.repeat(1023)}😀extra` });

    const body = fetch.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(Array.from(body.get('message') ?? '')).toHaveLength(1024);
    expect(body.get('message')).toMatch(/😀$/);
  });

  it('sets a deadline on provider requests', async () => {
    vi.stubEnv('PUSHOVER_TOKEN', 'token');
    vi.stubEnv('PUSHOVER_USER', 'user');
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    await sendPushover({ message: 'Alert' });

    expect(timeout).toHaveBeenCalledWith(PUSHOVER_TIMEOUT_MS);
    timeout.mockRestore();
  });
});
