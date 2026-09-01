'use client';

import { getDb } from '@ops-dashboard/core';
import type { Organization } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

const ORG_COLORS = [
  'oklch(0.6 0.13 265)',
  'oklch(0.7 0.16 150)',
  'oklch(0.72 0.16 60)',
  'oklch(0.65 0.18 280)',
  'oklch(0.7 0.18 30)',
  'oklch(0.68 0.18 350)',
];
const MAX_ORGANIZATION_NAME_LENGTH = 200;
const MAX_ORGANIZATION_COLOR_LENGTH = 100;
const MAX_ORGANIZATION_ID_LENGTH = 128;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

function organizationNameKey(value: string): string {
  return value.trim().normalize('NFKC').toLocaleLowerCase('en-US');
}

function normalizeOrganizationPatch(patch: Partial<Organization>): Partial<Organization> {
  const normalized = { ...patch };
  if (Object.hasOwn(normalized, 'name')) {
    if (typeof normalized.name !== 'string') throw new Error('Organization name is required.');
    normalized.name = normalized.name.trim();
    if (!normalized.name) throw new Error('Organization name is required.');
    if (Array.from(normalized.name).length > MAX_ORGANIZATION_NAME_LENGTH) {
      throw new Error('Organization name must contain at most 200 characters.');
    }
  }
  if (Object.hasOwn(normalized, 'color')) {
    if (typeof normalized.color !== 'string') throw new Error('Organization color is required.');
    normalized.color = normalized.color.trim();
    if (!normalized.color) throw new Error('Organization color is required.');
    if (Array.from(normalized.color).length > MAX_ORGANIZATION_COLOR_LENGTH) {
      throw new Error('Organization color must contain at most 100 characters.');
    }
  }
  if (Object.hasOwn(normalized, 'order') && !Number.isFinite(normalized.order)) {
    throw new Error('Organization order must be finite.');
  }
  return normalized;
}

export function nextOrgColor(existingCount: number): string {
  const safeCount = Number.isSafeInteger(existingCount) && existingCount >= 0 ? existingCount : 0;
  return ORG_COLORS[safeCount % ORG_COLORS.length] ?? ORG_COLORS[0]!;
}

export async function createOrganization(input: {
  name: string;
  color?: string;
  order?: number;
  /**
   * Deterministic id for seeded orgs so two devices racing to seed the same
   * org converge on one record instead of creating duplicates.
   */
  id?: string;
}): Promise<Organization> {
  const fields = normalizeOrganizationPatch({
    name: input.name,
    color: input.color ?? ORG_COLORS[0]!,
    order: input.order ?? Date.now(),
  });
  const name = fields.name!;
  const id = input.id?.trim();
  if (input.id !== undefined && !id) throw new Error('Organization id is required.');
  if (id && (Array.from(id).length > MAX_ORGANIZATION_ID_LENGTH || CONTROL_CHARACTERS.test(id))) {
    throw new Error('Organization id must be valid.');
  }

  const normalizedName = organizationNameKey(name);
  const organizations = await getDb().organizations.toArray();
  const idMatch = id ? organizations.find((organization) => organization.id === id) : undefined;
  if (idMatch && organizationNameKey(idMatch.name) !== normalizedName) {
    throw new Error('Organization id already exists.');
  }
  const duplicate = organizations.find(
    (organization) =>
      !organization.deletedAt &&
      !organization.archivedAt &&
      organizationNameKey(organization.name) === normalizedName,
  );
  if (duplicate) {
    if (id && duplicate.id === id) return duplicate;
    throw new Error('Organization already exists.');
  }

  const rec = newRecord<Organization>({
    name,
    color: fields.color!,
    order: fields.order!,
  });
  return putRecord('organizations', id ? { ...rec, id } : rec);
}

export function updateOrganization(id: string, patch: Partial<Organization>) {
  const fields = normalizeOrganizationPatch(patch);
  if (fields.name === undefined) return patchRecord<Organization>('organizations', id, fields);
  return updateOrganizationName(id, fields);
}

async function updateOrganizationName(id: string, fields: Partial<Organization>) {
  const normalizedName = organizationNameKey(fields.name!);
  const organizations = await getDb().organizations.toArray();
  const duplicate = organizations.some(
    (organization) =>
      organization.id !== id &&
      !organization.deletedAt &&
      !organization.archivedAt &&
      typeof organization.name === 'string' &&
      organizationNameKey(organization.name) === normalizedName,
  );
  if (duplicate) throw new Error('Organization already exists.');
  return patchRecord<Organization>('organizations', id, fields);
}

export const archiveOrganization = (id: string) =>
  patchRecord<Organization>('organizations', id, { archivedAt: new Date().toISOString() });

export const deleteOrganization = (id: string) =>
  softDeleteRecord<Organization>('organizations', id);
