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
const MAX_CONTENT_CHECKLIST_ITEMS = 100;
const MAX_CONTENT_CHECKLIST_ID_LENGTH = 128;
const MAX_CONTENT_CHECKLIST_TEXT_LENGTH = 500;

export function compareContentOrder(
  left: Pick<Content, 'id' | 'title' | 'order'>,
  right: Pick<Content, 'id' | 'title' | 'order'>,
): number {
  const leftValid = Number.isFinite(left.order);
  const rightValid = Number.isFinite(right.order);
  if (leftValid && rightValid && left.order !== right.order) return left.order - right.order;
  if (leftValid !== rightValid) return leftValid ? -1 : 1;
  const titleOrder = left.title.localeCompare(right.title);
  return titleOrder !== 0 ? titleOrder : left.id.localeCompare(right.id);
}

function normalizeContentUrl(value: string | undefined): string | undefined {
  const candidate = value?.trim();
  if (!candidate) return undefined;
  try {
    const internalPath =
      candidate.startsWith('/') &&
      !candidate.startsWith('//') &&
      !candidate.includes('\\') &&
      !/[\u0000-\u001f\u007f]/.test(candidate);
    const absoluteWebUrl = /^https?:\/\//i.test(candidate);
    if (!internalPath && !absoluteWebUrl) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(candidate)) {
        throw new Error('Content URL must use HTTP or HTTPS without credentials.');
      }
      throw new Error('Content URL must be valid.');
    }
    const url = new URL(candidate, 'https://ops-dashboard.invalid');
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) {
      throw new Error('Content URL must use HTTP or HTTPS without credentials.');
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Content URL must')) {
      throw error;
    }
    throw new Error('Content URL must be valid.');
  }
  return candidate;
}

function normalizeChecklist(value: unknown): Content['checklist'] {
  if (!Array.isArray(value)) throw new Error('Content checklist must be valid.');
  if (value.length > MAX_CONTENT_CHECKLIST_ITEMS) {
    throw new Error('Content checklist must contain at most 100 items.');
  }
  const seen = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Content checklist must be valid.');
    const { id, text, done } = item as Record<string, unknown>;
    const normalizedId = typeof id === 'string' ? id.trim() : '';
    const normalizedText = typeof text === 'string' ? text.trim() : '';
    if (
      !normalizedId ||
      !normalizedText ||
      Array.from(normalizedId).length > MAX_CONTENT_CHECKLIST_ID_LENGTH ||
      Array.from(normalizedText).length > MAX_CONTENT_CHECKLIST_TEXT_LENGTH ||
      typeof done !== 'boolean' ||
      seen.has(normalizedId)
    ) {
      throw new Error('Content checklist must be valid.');
    }
    seen.add(normalizedId);
    return { id: normalizedId, text: normalizedText, done };
  });
}

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
  if (Object.hasOwn(normalized, 'checklist')) {
    normalized.checklist = normalizeChecklist(normalized.checklist);
  }
  for (const key of ['channel', 'domainId', 'outline'] as const) {
    if (normalized[key] !== undefined) normalized[key] = normalized[key]?.trim() || undefined;
  }
  if (normalized.url !== undefined) normalized.url = normalizeContentUrl(normalized.url);
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
