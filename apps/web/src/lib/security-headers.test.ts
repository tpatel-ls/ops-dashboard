import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS } from './security-headers';

describe('security headers', () => {
  it('blocks framing and MIME sniffing without disabling first-party voice input', () => {
    expect(Object.fromEntries(SECURITY_HEADERS.map(({ key, value }) => [key, value]))).toEqual({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), geolocation=(), microphone=(self)',
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
    });
  });

  it('pins HTTPS for long enough to survive a lapsed visit', () => {
    const hsts = SECURITY_HEADERS.find(({ key }) => key === 'Strict-Transport-Security');
    const maxAge = Number(/max-age=(\d+)/.exec(hsts?.value ?? '')?.[1]);
    expect(maxAge).toBeGreaterThanOrEqual(31536000);
  });

  it('does not opt the domain into HSTS preloading', () => {
    const hsts = SECURITY_HEADERS.find(({ key }) => key === 'Strict-Transport-Security');
    expect(hsts?.value).not.toContain('preload');
  });
});
