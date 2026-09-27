import { describe, expect, it } from 'vitest';
import { compareQuoteRecency, createQuote, updateQuote } from './quotes';

describe('compareQuoteRecency', () => {
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
