import { describe, expect, it } from 'vitest';
import { normalizeCaptureTags } from './route-items';

describe('normalizeCaptureTags', () => {
  it('trims, normalizes, and deduplicates untrusted AI tags', () => {
    expect(normalizeCaptureTags([' Launch ', 'launch', '', 'CUSTOMER'])).toEqual([
      'launch',
      'customer',
    ]);
  });
});
