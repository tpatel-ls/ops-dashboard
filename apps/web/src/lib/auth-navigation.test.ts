import { describe, expect, it } from 'vitest';
import { DEFAULT_AUTH_DESTINATION, requestedAuthPath, safeNextPath } from './auth-navigation';

describe('safeNextPath', () => {
  it('defaults sign-in to the configured-view entry point', () => {
    expect(DEFAULT_AUTH_DESTINATION).toBe('/');
    expect(safeNextPath(undefined)).toBe('/');
    expect(safeNextPath('')).toBe('/');
  });

  it('keeps safe same-origin application paths', () => {
    expect(safeNextPath('/projects')).toBe('/projects');
    expect(safeNextPath('/tasks?status=open')).toBe('/tasks?status=open');
  });

  it('rejects protocol-relative and backslash redirects', () => {
    expect(safeNextPath('//example.com')).toBe('/');
    expect(safeNextPath('/\\example.com')).toBe('/');
    expect(safeNextPath('https://example.com')).toBe('/');
  });

  it('rejects encoded redirects and malformed escapes', () => {
    expect(safeNextPath('/%2f%2fevil.example')).toBe('/');
    expect(safeNextPath('/folder%5c..%5cevil')).toBe('/');
    expect(safeNextPath('/tasks%')).toBe('/');
    expect(safeNextPath('/%252f%252fevil.example')).toBe('/');
    expect(safeNextPath('/auth%252fsignout')).toBe('/');
  });

  it('rejects unreasonably long redirect destinations', () => {
    expect(safeNextPath(`/${'a'.repeat(2048)}`)).toBe('/');
  });

  it('rejects control characters in redirect destinations', () => {
    expect(safeNextPath('/tasks\nset-cookie: unsafe')).toBe('/');
    expect(safeNextPath('/tasks%0d%0aunsafe')).toBe('/');
  });

  it('rejects authentication routes that would loop after sign-in', () => {
    expect(safeNextPath('/login')).toBe('/');
    expect(safeNextPath('/LOGIN?error=invalid')).toBe('/');
    expect(safeNextPath('/auth/dev-login')).toBe('/');
    expect(safeNextPath('/auth/signout')).toBe('/');
    expect(safeNextPath('/auth%2fsignout')).toBe('/');
  });
});

describe('requestedAuthPath', () => {
  it('preserves the original query through sign-in', () => {
    expect(requestedAuthPath('/tasks', '?status=blocked&sort=due')).toBe(
      '/tasks?status=blocked&sort=due',
    );
  });

  it('ignores text that is not a URL query', () => {
    expect(requestedAuthPath('/tasks', 'https://example.com')).toBe('/tasks');
  });
});
