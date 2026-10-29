import { describe, expect, it } from 'vitest';
import { knownValue } from './known-value';

const STAGES = ['idea', 'draft', 'published'] as const;

describe('knownValue', () => {
  it('keeps a value that is allowed', () => {
    expect(knownValue('draft', STAGES, 'idea')).toBe('draft');
  });

  it('falls back for a missing, unknown, or non-string value', () => {
    for (const value of [undefined, null, '', 'archived', 'constructor', 'DRAFT', 1]) {
      expect(knownValue(value, STAGES, 'idea')).toBe('idea');
    }
  });
});
