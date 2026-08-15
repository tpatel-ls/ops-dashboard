import { describe, expect, it } from 'vitest';
import { resolveOrgContext } from './org-store';

describe('resolveOrgContext', () => {
  it('keeps built-in and active organization contexts', () => {
    expect(resolveOrgContext('all', ['org-1'])).toBe('all');
    expect(resolveOrgContext('personal', ['org-1'])).toBe('personal');
    expect(resolveOrgContext('org-1', ['org-1'])).toBe('org-1');
  });

  it('recovers stale persisted organization contexts', () => {
    expect(resolveOrgContext('archived-org', ['org-1'])).toBe('all');
  });
});
