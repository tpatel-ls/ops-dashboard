'use client';

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

export function nextOrgColor(existingCount: number): string {
  return ORG_COLORS[existingCount % ORG_COLORS.length] ?? ORG_COLORS[0]!;
}

export function createOrganization(input: {
  name: string;
  color?: string;
  order?: number;
  /**
   * Deterministic id for seeded orgs so two devices racing to seed the same
   * org converge on one record instead of creating duplicates.
   */
  id?: string;
}): Promise<Organization> {
  const rec = newRecord<Organization>({
    name: input.name,
    color: input.color ?? ORG_COLORS[0]!,
    order: input.order ?? Date.now(),
  });
  return putRecord('organizations', input.id ? { ...rec, id: input.id } : rec);
}

export const updateOrganization = (id: string, patch: Partial<Organization>) =>
  patchRecord<Organization>('organizations', id, patch);

export const archiveOrganization = (id: string) =>
  patchRecord<Organization>('organizations', id, { archivedAt: new Date().toISOString() });

export const deleteOrganization = (id: string) =>
  softDeleteRecord<Organization>('organizations', id);
