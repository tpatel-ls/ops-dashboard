export const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self)' },
  // The app is a PWA, so it only ever runs in a secure context anyway, but
  // without HSTS a first navigation typed as `http://` is still a plaintext
  // request that can be intercepted before the redirect. Two years, covering
  // subdomains. `preload` is deliberately omitted: submitting to the preload
  // list is a hard-to-reverse commitment for the whole domain, and that is
  // the domain owner's call rather than a default.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
] as const;
