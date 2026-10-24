import { describe, expect, it } from 'vitest';
import type { Person } from '@ops-dashboard/core';
import {
  compareInteractionRecency,
  comparePeopleByName,
  createPerson,
  latestInteraction,
  makeFact,
  makeInteraction,
  matchesPersonSearch,
  personInitials,
  safePersonFacts,
  safePersonInteractions,
  updatePerson,
} from './people';

describe('person input helpers', () => {
  it('reject malformed helper inputs with validation errors', () => {
    expect(() => makeFact(42 as never, 'value')).toThrow('Fact label and value are required.');
    expect(() => makeInteraction(42 as never)).toThrow('Interaction note is required.');
    expect(() => makeInteraction('Met', 42 as never)).toThrow('Interaction date must be valid.');
  });
});

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
  it('keeps only renderable synced facts and interactions', () => {
    expect(safePersonFacts(null)).toEqual([]);
    expect(
      safePersonFacts([
        { id: 'fact', label: 'Role', value: 'Lead' },
        { id: 'fact', label: 'Duplicate', value: 'Ignored' },
        null,
        { id: 'bad' },
      ]),
    ).toEqual([{ id: 'fact', label: 'Role', value: 'Lead' }]);
    expect(
      safePersonInteractions([
        { id: 'interaction', date: '2026-08-16', note: 'Met' },
        { id: 'bad', date: 42 },
        { id: ' ', date: '2026-08-16', note: 'Blank id' },
        { id: 'invalid-date', date: 'not-a-date', note: 'Broken date' },
        { id: 'blank-note', date: '2026-08-16', note: ' ' },
        { id: 'interaction', date: '2026-08-16', note: 'Duplicate' },
      ]),
    ).toEqual([{ id: 'interaction', date: '2026-08-16', note: 'Met' }]);
  });

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

  it('ignores malformed synced nested fields without throwing', () => {
    const malformed = {
      ...person,
      name: null,
      tags: [42],
      facts: [null, { label: 7, value: 'Vendor' }],
      interactions: [null, { note: 9 }],
    } as unknown as Person;

    expect(matchesPersonSearch(malformed, 'vendor')).toBe(true);
    expect(matchesPersonSearch(malformed, 'missing')).toBe(false);
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

  it('ignores malformed synced interactions without throwing', () => {
    expect(
      latestInteraction([
        null,
        { id: 'bad-date', date: 'not-a-date', note: 'Bad' },
        { id: 'valid', date: '2026-08-24T10:00:00Z', note: 'Valid' },
        { id: 'bad-shape', date: 42, note: 'Bad' },
      ] as never),
    ).toMatchObject({ id: 'valid' });
    expect(latestInteraction(null as never)).toBeNull();
  });

  it('ignores a valid date when synced interaction fields cannot be rendered', () => {
    expect(
      latestInteraction([
        { id: 'bad-note', date: '2026-08-25T10:00:00Z', note: 7 },
        { id: null, date: '2026-08-24T10:00:00Z', note: 'Missing id' },
        { id: 'valid', date: '2026-08-23T10:00:00Z', note: 'Valid' },
      ] as never),
    ).toMatchObject({ id: 'valid', note: 'Valid' });
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

describe('comparePeopleByName', () => {
  it('sorts malformed names without throwing and uses ids as a tie breaker', () => {
    const people = [
      { id: 'zulu', name: null as never },
      { id: 'alpha', name: null as never },
      { id: 'valid', name: 'Avery' },
    ];

    expect(() => people.sort(comparePeopleByName)).not.toThrow();
    expect(people.map((item) => item.id)).toEqual(['alpha', 'zulu', 'valid']);
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

  it('rejects non-string optional details with a validation error', () => {
    expect(() => updatePerson('person-1', { relationship: 42 as never })).toThrow(
      'Person details must be valid.',
    );
    expect(() => updatePerson('person-1', { avatarUrl: {} as never })).toThrow(
      'Person details must be valid.',
    );
    expect(() => updatePerson('person-1', { domainId: 42 as never })).toThrow(
      'Person details must be valid.',
    );
  });
});

describe('personInitials', () => {
  it('takes the first letter of the first two words', () => {
    expect(personInitials('ada lovelace byron')).toBe('AL');
    expect(personInitials('Cher')).toBe('C');
  });

  it('ignores repeated and surrounding whitespace between words', () => {
    expect(personInitials('Ada  Lovelace')).toBe('AL');
    expect(personInitials('  Ada\tLovelace ')).toBe('AL');
  });

  it('keeps astral characters whole', () => {
    expect(personInitials('𝒜da 𠀋ee')).toBe('𝒜𠀋');
  });

  it('returns an empty string for malformed synced names', () => {
    expect(personInitials(undefined)).toBe('');
    expect(personInitials(42)).toBe('');
    expect(personInitials('   ')).toBe('');
  });
});
