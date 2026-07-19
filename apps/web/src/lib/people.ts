'use client';

import { newId } from '@ops-dashboard/core';
import type { Interaction, Person, PersonFact } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

export function matchesPersonSearch(person: Person, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    person.name,
    person.relationship,
    ...person.tags,
    ...person.facts.flatMap((fact) => [fact.label, fact.value]),
  ].some((value) => value?.toLowerCase().includes(normalized));
}

export function createPerson(input: {
  name: string;
  relationship?: string;
  domainId?: string;
}): Promise<Person> {
  return putRecord(
    'people',
    newRecord<Person>({
      name: input.name,
      ...(input.relationship ? { relationship: input.relationship } : {}),
      ...(input.domainId ? { domainId: input.domainId } : {}),
      facts: [],
      interactions: [],
      tags: [],
    }),
  );
}

export const updatePerson = (id: string, patch: Partial<Person>) =>
  patchRecord<Person>('people', id, patch);

export const deletePerson = (id: string) => softDeleteRecord<Person>('people', id);

export function makeFact(label: string, value: string): PersonFact {
  return { id: newId(), label, value };
}

export function makeInteraction(note: string, date?: string): Interaction {
  return { id: newId(), date: date ?? new Date().toISOString(), note };
}
