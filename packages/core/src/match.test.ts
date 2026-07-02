import { describe, expect, it } from 'vitest';
import { matchByName } from './match';

const PROJECTS = [{ name: 'Blue Text' }, { name: 'Power Dialer' }, { name: 'Mini Monet' }];

describe('matchByName', () => {
  it('matches exact names', () => {
    expect(matchByName(PROJECTS, 'Blue Text')).toBe(PROJECTS[0]);
  });

  it('matches case-insensitively', () => {
    expect(matchByName(PROJECTS, 'blue text')).toBe(PROJECTS[0]);
    expect(matchByName(PROJECTS, 'POWER DIALER')).toBe(PROJECTS[1]);
  });

  it('ignores surrounding whitespace', () => {
    expect(matchByName(PROJECTS, '  Mini Monet ')).toBe(PROJECTS[2]);
  });

  it('returns undefined when nothing matches', () => {
    expect(matchByName(PROJECTS, 'Email Triage')).toBeUndefined();
  });

  it('returns undefined for missing or blank names', () => {
    expect(matchByName(PROJECTS, undefined)).toBeUndefined();
    expect(matchByName(PROJECTS, '   ')).toBeUndefined();
  });
});
