import { describe, expect, it } from 'vitest';
import { boundedText, boundedTextList } from './input';

describe('boundedText', () => {
  it('trims and limits string input', () => {
    expect(boundedText('  abcdef  ', 4)).toBe('abcd');
  });

  it('rejects non-string values and malformed limits', () => {
    expect(boundedText(42, 4)).toBe('');
    expect(boundedText('text', Number.NaN)).toBe('');
    expect(boundedText('text', -1)).toBe('');
  });

  it('does not split Unicode code points at the limit', () => {
    expect(boundedText('A😀B', 2)).toBe('A😀');
  });
});

describe('boundedTextList', () => {
  it('trims, limits, and filters string items', () => {
    expect(boundedTextList(['  alpha  ', '', 42, 'bravo'], 2, 4)).toEqual(['alph', 'brav']);
  });

  it('rejects malformed collections and limits', () => {
    expect(boundedTextList('alpha', 2, 10)).toEqual([]);
    expect(boundedTextList(['alpha'], Number.NaN, 10)).toEqual([]);
  });
});
