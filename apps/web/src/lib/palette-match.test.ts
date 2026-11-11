import { describe, expect, it } from 'vitest';
import { matchesPaletteEntry } from './palette-match';

describe('matchesPaletteEntry', () => {
  it('keeps every entry for a blank query', () => {
    expect(matchesPaletteEntry('', ['Settings'])).toBe(true);
    expect(matchesPaletteEntry('   ', ['Settings'])).toBe(true);
  });

  it('matches the label or a keyword, ignoring case and width', () => {
    expect(matchesPaletteEntry('sett', ['Settings'])).toBe(true);
    expect(matchesPaletteEntry('ROLL', ['Review today', 'daily', 'review', 'roll forward'])).toBe(
      true,
    );
    expect(matchesPaletteEntry('ｓｅｔｔｉｎｇｓ', ['Settings'])).toBe(true);
    expect(matchesPaletteEntry('inbox', ['Settings'])).toBe(false);
  });

  it('requires every query word to match somewhere', () => {
    const lane = ['Switch to Personal', 'switch', 'context', 'Personal'];
    expect(matchesPaletteEntry('switch personal', lane)).toBe(true);
    expect(matchesPaletteEntry('switch acme', lane)).toBe(false);
  });
});
