import { describe, expect, it } from 'vitest';
import { excerpt } from './excerpt';

// `String.prototype.isWellFormed` is newer than this project's lib target, so
// check for an unpaired surrogate directly.
function hasLoneSurrogate(value: string): boolean {
  return /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(value);
}

describe('excerpt', () => {
  it('returns a short body unchanged and adds no ellipsis', () => {
    expect(excerpt('Short note', 240)).toBe('Short note');
    expect(excerpt('', 240)).toBe('');
  });

  it('keeps a body of exactly the limit whole', () => {
    expect(excerpt('a'.repeat(240), 240)).toBe('a'.repeat(240));
  });

  it('truncates a longer body and marks it with an ellipsis', () => {
    expect(excerpt('a'.repeat(241), 240)).toBe(`${'a'.repeat(240)}…`);
  });

  it('never splits an astral character in half', () => {
    // A UTF-16 slice cuts the pair and leaves a lone surrogate, which renders
    // as the replacement glyph. The odd-length prefix puts the cut inside one.
    const body = `x${'\u{1F600}'.repeat(300)}`;

    const result = excerpt(body, 240);

    expect(hasLoneSurrogate(result)).toBe(false);
    expect(Array.from(result)).toHaveLength(241); // 240 characters plus the ellipsis
  });

  it('counts an astral character once against the limit', () => {
    expect(excerpt('\u{1F600}'.repeat(5), 5)).toBe('\u{1F600}'.repeat(5));
  });

  it('drops the whitespace the cut landed on before the ellipsis', () => {
    expect(excerpt('word     tail', 6)).toBe('word…');
  });
});
