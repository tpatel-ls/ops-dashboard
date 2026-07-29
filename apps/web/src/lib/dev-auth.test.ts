import { describe, expect, it } from 'vitest';
import { isLocalDevHost } from './dev-auth';

describe('isLocalDevHost', () => {
  it.each(['localhost', '127.0.0.1', '::1', '[::1]'])('accepts local host %s', (hostname) => {
    expect(isLocalDevHost(hostname)).toBe(true);
  });

  it('rejects non-local hosts', () => {
    expect(isLocalDevHost('example.com')).toBe(false);
  });
});
