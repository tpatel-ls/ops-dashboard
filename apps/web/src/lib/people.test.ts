import { describe, expect, it } from 'vitest';
import type { Person } from '@ops-dashboard/core';
import { latestInteraction, matchesPersonSearch } from './people';

const person = {
  name: 'Avery Morgan',
  relationship: 'Product lead',
  tags: ['LSG', 'Dialer'],
  facts: [{ id: 'fact-1', label: 'Timezone', value: 'Pacific' }],
  interactions: [
    { id: 'interaction-1', date: '2026-08-16', note: 'Discussed enterprise onboarding' },
  ],
} as Person;

describe('matchesPersonSearch', () => {
  it('matches useful relationship context without case sensitivity', () => {
    expect(matchesPersonSearch(person, 'avery')).toBe(true);
    expect(matchesPersonSearch(person, 'PRODUCT')).toBe(true);
    expect(matchesPersonSearch(person, 'dialer')).toBe(true);
    expect(matchesPersonSearch(person, 'pacific')).toBe(true);
    expect(matchesPersonSearch(person, 'onboarding')).toBe(true);
  });

  it('keeps every person for an empty query', () => {
    expect(matchesPersonSearch(person, '  ')).toBe(true);
  });

  it('rejects unrelated queries', () => {
    expect(matchesPersonSearch(person, 'finance')).toBe(false);
  });
});

describe('latestInteraction', () => {
  it('compares offset timestamps by instant and ignores malformed dates', () => {
    const latest = latestInteraction([
      { id: 'invalid', date: 'not-a-date', note: 'Invalid' },
      { id: 'earlier', date: '2026-08-24T14:00:00Z', note: 'Earlier' },
      { id: 'later', date: '2026-08-24T09:30:00-05:00', note: 'Later' },
    ]);

    expect(latest?.id).toBe('later');
    expect(latestInteraction([{ id: 'invalid', date: 'bad', note: 'Bad' }])).toBeNull();
  });
});
