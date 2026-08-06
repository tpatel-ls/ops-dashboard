import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestAllowed } from './guard';

afterEach(() => {
  vi.unstubAllEnvs();
});

function request(authorization?: string): Request {
  return new Request('https://dashboard.example/api/push', {
    headers: authorization ? { authorization } : undefined,
  });
}

describe('requestAllowed', () => {
  it('accepts a configured secret through the Bearer scheme', () => {
    vi.stubEnv('OPS_API_SECRET', 'ops-secret');

    expect(requestAllowed(request('Bearer ops-secret'))).toBe(true);
  });

  it('rejects secrets sent without the Bearer scheme', () => {
    vi.stubEnv('OPS_API_SECRET', 'ops-secret');

    expect(requestAllowed(request('ops-secret'))).toBe(false);
    expect(requestAllowed(request('Basic ops-secret'))).toBe(false);
  });
});
