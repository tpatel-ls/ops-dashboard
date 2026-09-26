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

describe('mergeImportedTags canonical form', () => {
  it('stores seed tags in the canonical NFKC form the tags index uses', () => {
    // routedTag / parseQuickAdd both record NFKC + en-US lowercase. A fullwidth
    // seed tag used to keep its width here, so it could never match them.
    expect(mergeImportedTags([], ['Ｃａｆｅ'])).toEqual(['cafe']);
    expect(mergeImportedTags([], ['Café'])).toEqual(['café']);
  });

  it('keeps already-stored tags untouched', () => {
    expect(mergeImportedTags(['Café'], ['café'])).toEqual(['Café']);
  });
});
