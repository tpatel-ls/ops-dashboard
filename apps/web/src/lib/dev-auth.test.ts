import { afterEach, describe, expect, it, vi } from 'vitest';
import { isDevAuthAvailable, isLocalDevHost } from './dev-auth';

describe('isLocalDevHost', () => {
  it.each(['localhost', '127.0.0.1', '::1', '[::1]'])('accepts local host %s', (hostname) => {
    expect(isLocalDevHost(hostname)).toBe(true);
  });

  it('rejects non-local hosts', () => {
    expect(isLocalDevHost('example.com')).toBe(false);
  });
});

// isDevAuthAvailable is the only gate on the dev sign-in bypass: it guards both
// issuing the ops-dev-auth cookie in the dev-login route and accepting it in
// the Supabase middleware. Losing either half of the condition would turn that
// cookie into a production auth bypass, so pin both halves.
describe('isDevAuthAvailable', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is unavailable in production even on a local host', () => {
    vi.stubEnv('NODE_ENV', 'production');
    for (const hostname of ['localhost', '127.0.0.1', '::1', '[::1]']) {
      expect(isDevAuthAvailable(hostname)).toBe(false);
    }
  });

  it('is unavailable off a local host even outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(isDevAuthAvailable('example.com')).toBe(false);
    expect(isDevAuthAvailable('localhost.example.com')).toBe(false);
  });

  it('is available only on a local host outside production', () => {
    for (const nodeEnv of ['development', 'test']) {
      vi.stubEnv('NODE_ENV', nodeEnv);
      expect(isDevAuthAvailable('localhost')).toBe(true);
    }
  });
});
