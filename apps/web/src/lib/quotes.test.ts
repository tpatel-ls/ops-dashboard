import { describe, expect, it } from 'vitest';
import { compareQuoteRecency } from './quotes';

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
