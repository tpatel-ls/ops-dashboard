'use client';

import type { Capture, CaptureKind, CaptureRoute, CaptureSource } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

const CAPTURE_SOURCES = new Set<CaptureSource>(['text', 'voice', 'watch', 'journal', 'notepad']);
const CAPTURE_KINDS = new Set<CaptureKind>([
  'task',
  'note',
  'journal',
  'event',
  'person',
  'quote',
  'routine',
  'food',
  'habit',
]);
const MAX_CAPTURE_RAW_LENGTH = 8_000;
const MAX_CAPTURE_SUMMARY_LENGTH = 500;
const MAX_CAPTURE_ROUTE_ID_LENGTH = 128;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function compareCaptureRecency(
  left: Pick<Capture, 'id' | 'createdAt'>,
  right: Pick<Capture, 'id' | 'createdAt'>,
): number {
  const leftTimestamp = Date.parse(left.createdAt);
  const rightTimestamp = Date.parse(right.createdAt);
  const leftValid = Number.isFinite(leftTimestamp);
  const rightValid = Number.isFinite(rightTimestamp);
  if (leftValid && rightValid && leftTimestamp !== rightTimestamp) {
    return rightTimestamp - leftTimestamp;
  }
  if (leftValid !== rightValid) return leftValid ? -1 : 1;
  return left.id.localeCompare(right.id);
}

export function createCapture(raw: string, source: CaptureSource = 'text'): Promise<Capture> {
  const normalizedRaw = raw.trim();
  if (!normalizedRaw) throw new Error('Capture text is required.');
  if (Array.from(normalizedRaw).length > MAX_CAPTURE_RAW_LENGTH) {
    throw new Error('Capture text must contain at most 8000 characters.');
  }
  if (!CAPTURE_SOURCES.has(source)) throw new Error('Capture source must be valid.');
  return putRecord(
    'captures',
    newRecord<Capture>({ raw: normalizedRaw, source, status: 'pending' }),
  );
}

export const setCaptureRoute = (
  id: string,
  routedTo: CaptureRoute,
  aiKind?: CaptureKind,
  aiSummary?: string,
) => {
  if (
    !routedTo ||
    typeof routedTo !== 'object' ||
    !CAPTURE_KINDS.has(routedTo.type) ||
    typeof routedTo.id !== 'string'
  ) {
    throw new Error('Capture route must be valid.');
  }
  const routeId = routedTo.id.trim();
  if (
    !routeId ||
    routeId.length > MAX_CAPTURE_ROUTE_ID_LENGTH ||
    CONTROL_CHARACTERS.test(routeId)
  ) {
    throw new Error('Capture route must be valid.');
  }
  if (aiKind !== undefined && !CAPTURE_KINDS.has(aiKind)) {
    throw new Error('Capture kind must be valid.');
  }
  if (aiSummary !== undefined && typeof aiSummary !== 'string') {
    throw new Error('Capture summary must be valid.');
  }
  const summary = aiSummary?.trim();
  if (summary && Array.from(summary).length > MAX_CAPTURE_SUMMARY_LENGTH) {
    throw new Error('Capture summary must contain at most 500 characters.');
  }
  return patchRecord<Capture>('captures', id, {
    status: 'triaged',
    routedTo: { type: routedTo.type, id: routeId },
    ...(aiKind ? { aiKind } : {}),
    ...(summary ? { aiSummary: summary } : {}),
  });
};

export const dismissCapture = (id: string) =>
  patchRecord<Capture>('captures', id, { status: 'dismissed' });

export const deleteCapture = (id: string) => softDeleteRecord<Capture>('captures', id);
