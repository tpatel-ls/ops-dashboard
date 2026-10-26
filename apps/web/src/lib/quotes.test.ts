import { describe, expect, it } from 'vitest';
import {
  compareQuoteRecency,
  createQuote,
  safeQuoteTags,
  safeQuoteThoughts,
  updateQuote,
} from './quotes';

describe('compareQuoteRecency', () => {
  it('keeps malformed synced tags and thoughts out of the card', () => {
    expect(safeQuoteTags(['work', 42, null, 'work'])).toEqual(['work']);
    expect(
      safeQuoteThoughts([
        { id: 'thought', text: 'Useful', at: '2026-08-24' },
        { id: 'bad' },
        { id: ' ', text: 'Empty id', at: '2026-08-24' },
        { id: 'invalid', text: 'Broken date', at: 'not-a-date' },
        { id: 'thought', text: 'Duplicate', at: '2026-08-25' },
      ]),
    ).toEqual([{ id: 'thought', text: 'Useful', at: '2026-08-24' }]);
  });

  it('trims, deduplicates, and bounds synced quote tags', () => {
    expect(
      safeQuoteTags([
        ' Work ',
        'work',
        'x'.repeat(2_049),
        ...Array.from({ length: 100 }, (_, i) => `tag-${i}`),
      ]),
    ).toEqual(['Work', ...Array.from({ length: 97 }, (_, i) => `tag-${i}`)]);
  });

  it('bounds synced thought identifiers and text', () => {
    expect(
      safeQuoteThoughts([
        { id: 'i'.repeat(129), text: 'Too long', at: '2026-08-24' },
        { id: 'long-text', text: 'x'.repeat(2_001), at: '2026-08-24' },
        { id: 'valid', text: 'Useful', at: '2026-08-24' },
      ]),
    ).toEqual([{ id: 'valid', text: 'Useful', at: '2026-08-24' }]);
    expect(
      safeQuoteThoughts(
        Array.from({ length: 101 }, (_, index) => ({
          id: `thought-${index}`,
          text: 'Useful',
          at: '2026-08-24',
        })),
      ),
    ).toHaveLength(100);
  });

  it('orders quote instants and leaves malformed records last', () => {
    const quotes = [
      { id: 'invalid', createdAt: 'not-a-date' },
      { id: 'later', createdAt: '2026-08-24T09:30:00-05:00' },
      { id: 'earlier', createdAt: '2026-08-24T14:00:00Z' },
    ];

    expect(quotes.sort(compareQuoteRecency).map((quote) => quote.id)).toEqual([
      'later',
      'earlier',
      'invalid',
    ]);
  });

  it('breaks equal and malformed timestamp ties by id', () => {
    const quotes = [
      { id: 'zulu', createdAt: 'invalid' },
      { id: 'bravo', createdAt: '2026-08-24T14:00:00Z' },
      { id: 'alpha', createdAt: '2026-08-24T09:00:00-05:00' },
    ];

    expect(quotes.sort(compareQuoteRecency).map((quote) => quote.id)).toEqual([
      'alpha',
      'bravo',
      'zulu',
    ]);
  });
});

describe('quote attribution bounds', () => {
  it('rejects non-string attribution fields with a validation error', () => {
    expect(() => updateQuote('quote-1', { author: 42 as never })).toThrow(
      'Quote attribution must be valid.',
    );
    expect(() => updateQuote('quote-1', { source: 42 as never })).toThrow(
      'Quote attribution must be valid.',
    );
  });

  it('bounds the author, source, and book reference', () => {
    expect(() => createQuote({ text: 'Stay curious.', author: 'a'.repeat(501) })).toThrow(
      'Quote attribution must be valid.',
    );
    expect(() => updateQuote('quote-1', { source: 's'.repeat(201) })).toThrow(
      'Quote attribution must be valid.',
    );
    expect(() => updateQuote('quote-1', { bookId: 'b'.repeat(129) })).toThrow(
      'Quote attribution must be valid.',
    );
  });

  it('counts the author bound in characters, not UTF-16 units', () => {
    expect(
      () => void updateQuote('quote-1', { author: '\u{1F600}'.repeat(500) }).catch(() => {}),
    ).not.toThrow();
  });
});
