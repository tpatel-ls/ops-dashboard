import { describe, expect, it } from 'vitest';
import { DEFAULT_AUTH_DESTINATION, safeNextPath } from './auth-navigation';

describe('safeNextPath', () => {
  it('defaults sign-in to the work dashboard', () => {
    expect(DEFAULT_AUTH_DESTINATION).toBe('/dashboard');
    expect(safeNextPath(undefined)).toBe('/dashboard');
    expect(safeNextPath('')).toBe('/dashboard');
  });

  it('keeps safe same-origin application paths', () => {
    expect(safeNextPath('/projects')).toBe('/projects');
    expect(safeNextPath('/tasks?status=open')).toBe('/tasks?status=open');
  });

  it('rejects protocol-relative and backslash redirects', () => {
    expect(safeNextPath('//example.com')).toBe('/dashboard');
    expect(safeNextPath('/\\example.com')).toBe('/dashboard');
    expect(safeNextPath('https://example.com')).toBe('/dashboard');
  });
});
