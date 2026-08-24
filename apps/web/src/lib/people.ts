'use client';

import { localDay, newId } from '@ops-dashboard/core';
import type { Interaction, Person, PersonFact } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';
import { normalizeStringList } from './string-list';

function normalizeInteractionDate(value: string): string {
  if (localDay(value) === value) return value;
  const datePart = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value) || localDay(datePart) !== datePart) {
    throw new Error('Person interactions must be valid.');
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error('Person interactions must be valid.');
  return new Date(timestamp).toISOString();
}

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
    normalized.tags = normalizeStringList(normalized.tags, 'Person tags must be valid.');
  }
  if (Object.hasOwn(normalized, 'facts')) {
    if (!Array.isArray(normalized.facts)) throw new Error('Person facts must be valid.');
    const seen = new Set<string>();
    normalized.facts = normalized.facts.map((fact) => {
      if (
        !fact ||
        typeof fact !== 'object' ||
        typeof fact.id !== 'string' ||
        typeof fact.label !== 'string' ||
        typeof fact.value !== 'string'
      ) {
        throw new Error('Person facts must be valid.');
      }
      const id = fact.id.trim();
      const label = fact.label.trim();
      const value = fact.value.trim();
      if (!id || !label || !value || seen.has(id)) {
        throw new Error('Person facts must be valid.');
      }
      seen.add(id);
      return { ...fact, id, label, value };
    });
  }
  if (Object.hasOwn(normalized, 'interactions')) {
    if (!Array.isArray(normalized.interactions)) {
      throw new Error('Person interactions must be valid.');
    }
    const seen = new Set<string>();
    normalized.interactions = normalized.interactions.map((interaction) => {
      if (
        !interaction ||
        typeof interaction !== 'object' ||
        typeof interaction.id !== 'string' ||
        typeof interaction.note !== 'string' ||
        typeof interaction.date !== 'string'
      ) {
        throw new Error('Person interactions must be valid.');
      }
      const id = interaction.id.trim();
      const note = interaction.note.trim();
      if (!id || !note || seen.has(id)) {
        throw new Error('Person interactions must be valid.');
      }
      const date = normalizeInteractionDate(interaction.date);
      seen.add(id);
      return { id, date, note };
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
    ...person.interactions.map((interaction) => interaction.note),
  ].some((value) => value?.toLowerCase().includes(normalized));
}

export function latestInteraction(interactions: Interaction[]): Interaction | null {
  let latest: Interaction | null = null;
  let latestTimestamp = Number.NEGATIVE_INFINITY;
  for (const interaction of interactions) {
    const timestamp = Date.parse(interaction.date);
    if (!Number.isFinite(timestamp)) continue;
    if (
      timestamp > latestTimestamp ||
      (timestamp === latestTimestamp && latest && interaction.id < latest.id)
    ) {
      latest = interaction;
      latestTimestamp = timestamp;
    }
  }
  return latest;
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
  let normalizedDate: string;
  try {
    normalizedDate = normalizeInteractionDate(date ?? new Date().toISOString());
  } catch {
    throw new Error('Interaction date must be valid.');
  }
  return { id: newId(), date: normalizedDate, note: normalizedNote };
}
