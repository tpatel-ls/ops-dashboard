import { describe, expect, it } from 'vitest';
import type { Person } from '@ops-dashboard/core';
import { compareInteractionRecency, latestInteraction, matchesPersonSearch } from './people';

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

  it('matches canonically equivalent Unicode search text', () => {
    const unicodePerson = {
      ...person,
      name: 'Ren\u00e9e Flores',
      facts: [{ id: 'fact-1', label: 'Company', value: '\uff2c\uff33 Global' }],
    } as Person;

    expect(matchesPersonSearch(unicodePerson, 'Rene\u0301e')).toBe(true);
    expect(matchesPersonSearch(unicodePerson, 'LS global')).toBe(true);
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

describe('compareInteractionRecency', () => {
  it('orders valid interactions newest first and malformed dates last', () => {
    const interactions = [
      { id: 'invalid', date: 'not-a-date', note: 'Invalid' },
      { id: 'earlier', date: '2026-08-24T14:00:00Z', note: 'Earlier' },
      { id: 'later', date: '2026-08-24T09:30:00-05:00', note: 'Later' },
    ];

    expect(interactions.sort(compareInteractionRecency).map((item) => item.id)).toEqual([
      'later',
      'earlier',
      'invalid',
    ]);
  });
});
