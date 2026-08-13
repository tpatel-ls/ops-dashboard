'use client';

import { localDay, newId } from '@ops-dashboard/core';
import type { Interaction, Person, PersonFact } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

function normalizePersonPatch(patch: Partial<Person>): Partial<Person> {
  const normalized = { ...patch };
  if (Object.hasOwn(normalized, 'name')) {
    if (typeof normalized.name !== 'string') throw new Error('Person name is required.');
    normalized.name = normalized.name.trim();
    if (!normalized.name) throw new Error('Person name is required.');
  }
  for (const key of ['relationship', 'avatarUrl', 'domainId'] as const) {
    if (normalized[key] !== undefined) normalized[key] = normalized[key]?.trim() || undefined;
  }
  if (Object.hasOwn(normalized, 'tags')) {
    if (!normalized.tags) throw new Error('Person tags must be valid.');
    normalized.tags = [...new Set(normalized.tags.map((tag) => tag.trim()).filter(Boolean))];
  }
  if (Object.hasOwn(normalized, 'facts')) {
    if (!normalized.facts) throw new Error('Person facts must be valid.');
    normalized.facts = normalized.facts.map((fact) => {
      const id = fact.id.trim();
      const label = fact.label.trim();
      const value = fact.value.trim();
      if (!id || !label || !value) throw new Error('Person facts must be valid.');
      return { ...fact, id, label, value };
    });
  }
  if (Object.hasOwn(normalized, 'interactions')) {
    if (!normalized.interactions) throw new Error('Person interactions must be valid.');
    normalized.interactions = normalized.interactions.map((interaction) => {
      const id = interaction.id.trim();
      const note = interaction.note.trim();
      if (!id || !note || localDay(interaction.date) === undefined) {
        throw new Error('Person interactions must be valid.');
      }
      return { ...interaction, id, note };
    });
  }
  return normalized;
}

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
  const fields = normalizePersonPatch({
    name: input.name,
    relationship: input.relationship,
    domainId: input.domainId,
  });

  return putRecord(
    'people',
    newRecord<Person>({
      name: fields.name!,
      ...(fields.relationship ? { relationship: fields.relationship } : {}),
      ...(fields.domainId ? { domainId: fields.domainId } : {}),
      facts: [],
      interactions: [],
      tags: [],
    }),
  );
}

export const updatePerson = (id: string, patch: Partial<Person>) =>
  patchRecord<Person>('people', id, normalizePersonPatch(patch));

export const deletePerson = (id: string) => softDeleteRecord<Person>('people', id);

export function makeFact(label: string, value: string): PersonFact {
  const normalizedLabel = label.trim();
  const normalizedValue = value.trim();
  if (!normalizedLabel || !normalizedValue) {
    throw new Error('Fact label and value are required.');
  }
  return { id: newId(), label: normalizedLabel, value: normalizedValue };
}

export function makeInteraction(note: string, date?: string): Interaction {
  const normalizedNote = note.trim();
  if (!normalizedNote) throw new Error('Interaction note is required.');
  if (date !== undefined && localDay(date) === undefined) {
    throw new Error('Interaction date must be valid.');
  }
  return { id: newId(), date: date ?? new Date().toISOString(), note: normalizedNote };
}
