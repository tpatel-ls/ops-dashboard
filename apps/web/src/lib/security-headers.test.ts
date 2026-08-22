import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS } from './security-headers';

describe('security headers', () => {
  it('blocks framing and MIME sniffing without disabling first-party voice input', () => {
    expect(Object.fromEntries(SECURITY_HEADERS.map(({ key, value }) => [key, value]))).toEqual({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), geolocation=(), microphone=(self)',
    });
  });
});
