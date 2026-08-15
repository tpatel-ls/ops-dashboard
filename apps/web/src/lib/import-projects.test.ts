import { describe, expect, it } from 'vitest';
import { portfolioNeedsDefaultOrganization } from './import-projects';

describe('portfolioNeedsDefaultOrganization', () => {
  it('seeds the work organization only when an LSG project is requested', () => {
    expect(portfolioNeedsDefaultOrganization(['Blue Text'])).toBe(true);
    expect(portfolioNeedsDefaultOrganization(['Power Dialer', 'Mini Monet'])).toBe(true);
    expect(portfolioNeedsDefaultOrganization(['Mini Monet', 'Email Triage'])).toBe(false);
    expect(portfolioNeedsDefaultOrganization(['Unknown project'])).toBe(false);
  });
});
