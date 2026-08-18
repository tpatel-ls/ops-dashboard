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

function normalizeOrganizationPatch(patch: Partial<Organization>): Partial<Organization> {
  const normalized = { ...patch };
  if (Object.hasOwn(normalized, 'name')) {
    if (typeof normalized.name !== 'string') throw new Error('Organization name is required.');
    normalized.name = normalized.name.trim();
    if (!normalized.name) throw new Error('Organization name is required.');
  }
  if (Object.hasOwn(normalized, 'color')) {
    if (typeof normalized.color !== 'string') throw new Error('Organization color is required.');
    normalized.color = normalized.color.trim();
    if (!normalized.color) throw new Error('Organization color is required.');
  }
  if (Object.hasOwn(normalized, 'order') && !Number.isFinite(normalized.order)) {
    throw new Error('Organization order must be finite.');
  }
  return normalized;
}

export function nextOrgColor(existingCount: number): string {
  return ORG_COLORS[existingCount % ORG_COLORS.length] ?? ORG_COLORS[0]!;
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

  const normalizedName = name.toLocaleLowerCase();
  const organizations = await getDb().organizations.toArray();
  const duplicate = organizations.find(
    (organization) =>
      !organization.deletedAt &&
      !organization.archivedAt &&
      organization.name.trim().toLocaleLowerCase() === normalizedName,
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
  const normalizedName = fields.name!.toLocaleLowerCase();
  const organizations = await getDb().organizations.toArray();
  const duplicate = organizations.some(
    (organization) =>
      organization.id !== id &&
      !organization.deletedAt &&
      !organization.archivedAt &&
      typeof organization.name === 'string' &&
      organization.name.trim().toLocaleLowerCase() === normalizedName,
  );
  if (duplicate) throw new Error('Organization already exists.');
  return patchRecord<Organization>('organizations', id, fields);
}

export const archiveOrganization = (id: string) =>
  patchRecord<Organization>('organizations', id, { archivedAt: new Date().toISOString() });

export const deleteOrganization = (id: string) =>
  softDeleteRecord<Organization>('organizations', id);
