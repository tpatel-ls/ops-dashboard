'use client';

import type { Content, ContentType } from '@drift/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

export function createContent(input: {
  title: string;
  type?: ContentType;
  channel?: string;
  domainId?: string;
  url?: string;
}): Promise<Content> {
  return putRecord(
    'content',
    newRecord<Content>({
      title: input.title,
      type: input.type ?? 'video',
      status: 'idea',
      ...(input.channel ? { channel: input.channel } : {}),
      ...(input.domainId ? { domainId: input.domainId } : {}),
      ...(input.url ? { url: input.url } : {}),
      checklist: [],
      order: Date.now(),
    }),
  );
}

export const updateContent = (id: string, patch: Partial<Content>) =>
  patchRecord<Content>('content', id, patch);

export const deleteContent = (id: string) => softDeleteRecord<Content>('content', id);
