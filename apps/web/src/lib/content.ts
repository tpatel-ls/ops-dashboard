'use client';

import { localDay } from '@ops-dashboard/core';
import type { Content, ContentStatus, ContentType } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

const CONTENT_TYPES = new Set<ContentType>(['video', 'article', 'podcast', 'newsletter']);
const CONTENT_STATUSES = new Set<ContentStatus>([
  'idea',
  'outline',
  'draft',
  'editing',
  'waiting',
  'published',
  'done',
]);

function normalizeContentPatch(patch: Partial<Content>): Partial<Content> {
  const normalized = { ...patch };
  if (Object.hasOwn(normalized, 'title')) {
    if (typeof normalized.title !== 'string') throw new Error('Content title is required.');
    normalized.title = normalized.title.trim();
    if (!normalized.title) throw new Error('Content title is required.');
  }
  if (Object.hasOwn(normalized, 'type') && !CONTENT_TYPES.has(normalized.type!)) {
    throw new Error('Content type must be valid.');
  }
  if (Object.hasOwn(normalized, 'status') && !CONTENT_STATUSES.has(normalized.status!)) {
    throw new Error('Content status must be valid.');
  }
  if (
    normalized.publishDate !== undefined &&
    localDay(normalized.publishDate) !== normalized.publishDate
  ) {
    throw new Error('Content publish date must be a valid calendar day.');
  }
  if (Object.hasOwn(normalized, 'order') && !Number.isFinite(normalized.order)) {
    throw new Error('Content order must be finite.');
  }
  if (Object.hasOwn(normalized, 'checklist') && !normalized.checklist) {
    throw new Error('Content checklist must be valid.');
  }
  for (const key of ['channel', 'domainId', 'url', 'outline'] as const) {
    if (normalized[key] !== undefined) normalized[key] = normalized[key]?.trim() || undefined;
  }
  return normalized;
}

export function createContent(input: {
  title: string;
  type?: ContentType;
  channel?: string;
  domainId?: string;
  url?: string;
}): Promise<Content> {
  const fields = normalizeContentPatch({
    title: input.title,
    type: input.type ?? 'video',
    channel: input.channel,
    domainId: input.domainId,
    url: input.url,
  });

  return putRecord(
    'content',
    newRecord<Content>({
      title: fields.title!,
      type: fields.type!,
      status: 'idea',
      ...(fields.channel ? { channel: fields.channel } : {}),
      ...(fields.domainId ? { domainId: fields.domainId } : {}),
      ...(fields.url ? { url: fields.url } : {}),
      checklist: [],
      order: Date.now(),
    }),
  );
}

export const updateContent = (id: string, patch: Partial<Content>) =>
  patchRecord<Content>('content', id, normalizeContentPatch(patch));

export const deleteContent = (id: string) => softDeleteRecord<Content>('content', id);
