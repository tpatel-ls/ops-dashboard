import { afterEach, describe, expect, it, vi } from 'vitest';
import { healthRequestAuthorized } from './health-auth';

afterEach(() => {
  vi.unstubAllEnvs();
});

function request(token?: string): Request {
  return new Request('http://localhost/api/health', {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
}

describe('healthRequestAuthorized', () => {
  it('accepts either configured health secret', () => {
    vi.stubEnv('CRON_SECRET', 'cron-secret');
    vi.stubEnv('OPS_API_SECRET', 'ops-secret');

    expect(healthRequestAuthorized(request('cron-secret'))).toBe(true);
    expect(healthRequestAuthorized(request('ops-secret'))).toBe(true);
    expect(healthRequestAuthorized(request('wrong-secret'))).toBe(false);
  });

  it('rejects configured secrets without the Bearer scheme', () => {
    vi.stubEnv('CRON_SECRET', 'cron-secret');

    expect(
      healthRequestAuthorized(
        new Request('http://localhost/api/health', {
          headers: { authorization: 'cron-secret' },
        }),
      ),
    ).toBe(false);
  });

  it('remains open when neither secret is configured', () => {
    vi.stubEnv('CRON_SECRET', '');
    vi.stubEnv('OPS_API_SECRET', '');

    expect(healthRequestAuthorized(request())).toBe(true);
  });
});
