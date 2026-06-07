'use client';

import type { Domain } from '@drift/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

export function createDomain(input: {
  name: string;
  color: string;
  icon?: string;
  description?: string;
  order?: number;
}): Promise<Domain> {
  return putRecord(
    'domains',
    newRecord<Domain>({
      name: input.name,
      color: input.color,
      ...(input.icon ? { icon: input.icon } : {}),
      ...(input.description ? { description: input.description } : {}),
      order: input.order ?? Date.now(),
    }),
  );
}

export const updateDomain = (id: string, patch: Partial<Domain>) =>
  patchRecord<Domain>('domains', id, patch);

export const archiveDomain = (id: string) =>
  patchRecord<Domain>('domains', id, { archivedAt: new Date().toISOString() });

export const deleteDomain = (id: string) => softDeleteRecord<Domain>('domains', id);
