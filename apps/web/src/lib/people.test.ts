import { describe, expect, it } from 'vitest';
import type { Person } from '@ops-dashboard/core';
import {
  compareInteractionRecency,
  createPerson,
  latestInteraction,
  matchesPersonSearch,
  updatePerson,
} from './people';

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

  it('selects the lexicographically smallest id when timestamps are equal', () => {
    expect(
      latestInteraction([
        { id: 'zeta', date: '2026-08-24T10:00:00Z', note: 'Later A' },
        { id: 'alpha', date: '2026-08-24T10:00:00Z', note: 'Later B' },
      ]),
    ).toMatchObject({ id: 'alpha' });
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

// normalizePersonPatch runs before either writer reaches Dexie, so a rejection
// is observable synchronously. An accepted patch does reach it, so settle that
// rejection rather than leaving it unhandled.
function accepts(patch: Parameters<typeof updatePerson>[1]): () => void {
  return () => void updatePerson('person-1', patch).catch(() => {});
}

describe('person field validation', () => {
  it('still requires a name that survives trimming', () => {
    expect(() => createPerson({ name: '   ' })).toThrow('Person name is required.');
    expect(() => updatePerson('person-1', { name: 7 as unknown as string })).toThrow(
      'Person name is required.',
    );
  });

  it('bounds the person name like every other primary field', () => {
    expect(accepts({ name: 'a'.repeat(500) })).not.toThrow();
    expect(() => updatePerson('person-1', { name: 'a'.repeat(501) })).toThrow(
      'Person name must contain at most 500 characters.',
    );
  });

  it('counts the name bound in characters, not UTF-16 units', () => {
    expect(accepts({ name: '\u{1F600}'.repeat(500) })).not.toThrow();
  });

  it('bounds the relationship, avatar URL, and domain reference', () => {
    expect(() => updatePerson('person-1', { relationship: 'r'.repeat(201) })).toThrow(
      'Person details must be valid.',
    );
    expect(() => updatePerson('person-1', { avatarUrl: `https://x/${'a'.repeat(2048)}` })).toThrow(
      'Person details must be valid.',
    );
    expect(() => updatePerson('person-1', { domainId: 'd'.repeat(129) })).toThrow(
      'Person details must be valid.',
    );
  });

  it('keeps accepting the optional details at their limit and when cleared', () => {
    expect(accepts({ relationship: 'r'.repeat(200) })).not.toThrow();
    expect(accepts({ avatarUrl: 'a'.repeat(2048) })).not.toThrow();
    expect(accepts({ domainId: 'd'.repeat(128) })).not.toThrow();
    expect(accepts({ relationship: '   ' })).not.toThrow();
  });
});
