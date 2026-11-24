import { describe, expect, it } from 'vitest';
import { graphemeClusters } from './graphemes';

describe('graphemeClusters', () => {
  it('keeps each visible character whole', () => {
    expect(graphemeClusters('a\u{1F1FA}\u{1F1F8}é\u{1F44D}\u{1F3FD}')).toEqual([
      'a',
      '\u{1F1FA}\u{1F1F8}',
      'é',
      '\u{1F44D}\u{1F3FD}',
    ]);
  });

  it('returns no clusters for an empty string', () => {
    expect(graphemeClusters('')).toEqual([]);
  });
});
