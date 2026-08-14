import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock('@/utils/supabase/server', () => ({ createClient: mocks.createClient }));

import { requestAllowed } from './guard';

afterEach(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  mocks.createClient.mockReset().mockResolvedValue(null);
});

function request(authorization?: string): Request {
  return new Request('https://dashboard.example/api/push', {
    headers: authorization ? { authorization } : undefined,
  });
}

describe('requestAllowed', () => {
  it('accepts a configured secret through the Bearer scheme', async () => {
    vi.stubEnv('OPS_API_SECRET', 'ops-secret');

    await expect(requestAllowed(request('Bearer ops-secret'))).resolves.toBe(true);
  });

  it('rejects secrets sent without the Bearer scheme', async () => {
    vi.stubEnv('OPS_API_SECRET', 'ops-secret');

    await expect(requestAllowed(request('ops-secret'))).resolves.toBe(false);
    await expect(requestAllowed(request('Basic ops-secret'))).resolves.toBe(false);
  });

  it('requires a signed-in session for browser requests when Supabase is configured', async () => {
    const getClaims = vi.fn().mockResolvedValue({ data: { claims: null } });
    mocks.createClient.mockResolvedValue({ auth: { getClaims } });
    const browserRequest = new Request('https://dashboard.example/api/push', {
      headers: { 'sec-fetch-site': 'same-origin' },
    });

    await expect(requestAllowed(browserRequest)).resolves.toBe(false);

    getClaims.mockResolvedValue({ data: { claims: { sub: 'user-1' } } });
    await expect(requestAllowed(browserRequest)).resolves.toBe(true);
  });

  it('keeps same-origin browser APIs available in local-first mode', async () => {
    const browserRequest = new Request('https://dashboard.example/api/push', {
      headers: { 'sec-fetch-site': 'same-origin' },
    });

    await expect(requestAllowed(browserRequest)).resolves.toBe(true);
  });
});
