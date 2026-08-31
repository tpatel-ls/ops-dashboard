import { describe, expect, it } from 'vitest';
import { mergeImportedTags, portfolioNeedsDefaultOrganization } from './import-projects';

describe('portfolioNeedsDefaultOrganization', () => {
  it('seeds the work organization only when an LSG project is requested', () => {
    expect(portfolioNeedsDefaultOrganization(['Blue Text'])).toBe(true);
    expect(portfolioNeedsDefaultOrganization(['Power Dialer', 'Mini Monet'])).toBe(true);
    expect(portfolioNeedsDefaultOrganization(['Mini Monet', 'Email Triage'])).toBe(false);
    expect(portfolioNeedsDefaultOrganization(['Unknown project'])).toBe(false);
  });

  it('recognizes canonically equivalent portfolio names', () => {
    expect(portfolioNeedsDefaultOrganization(['Ｂｌｕｅ Text'])).toBe(true);
  });
});

describe('mergeImportedTags', () => {
  it('deduplicates canonical tag variants and skips blank seed tags', () => {
    expect(mergeImportedTags(['Caf\u00e9'], [' Cafe\u0301 ', '  ', ' Planning '])).toEqual([
      'Caf\u00e9',
      'planning',
    ]);
  });
});
