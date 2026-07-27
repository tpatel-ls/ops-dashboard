import { describe, expect, it } from 'vitest';
import { boundedText } from './input';

describe('boundedText', () => {
  it('trims and limits string input', () => {
    expect(boundedText('  abcdef  ', 4)).toBe('abcd');
  });

  it('rejects non-string values and malformed limits', () => {
    expect(boundedText(42, 4)).toBe('');
    expect(boundedText('text', Number.NaN)).toBe('');
    expect(boundedText('text', -1)).toBe('');
  });
});
