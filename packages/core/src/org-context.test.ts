import { describe, expect, it } from 'vitest';
import { matchesOrgContext } from './org-context';

describe('matchesOrgContext', () => {
  it('matches everything under all', () => {
    expect(matchesOrgContext(undefined, 'all')).toBe(true);
    expect(matchesOrgContext('org_1', 'all')).toBe(true);
  });

  it('personal matches only records without an orgId', () => {
    expect(matchesOrgContext(undefined, 'personal')).toBe(true);
    expect(matchesOrgContext('', 'personal')).toBe(true);
    expect(matchesOrgContext('org_1', 'personal')).toBe(false);
  });

  it('a specific org matches only its own records', () => {
    expect(matchesOrgContext('org_1', 'org_1')).toBe(true);
    expect(matchesOrgContext('org_2', 'org_1')).toBe(false);
    expect(matchesOrgContext(undefined, 'org_1')).toBe(false);
  });
});
