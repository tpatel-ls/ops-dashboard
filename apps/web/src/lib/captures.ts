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

export function createCapture(raw: string, source: CaptureSource = 'text'): Promise<Capture> {
  const normalizedRaw = raw.trim();
  if (!normalizedRaw) throw new Error('Capture text is required.');
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
  const routeId = routedTo.id.trim();
  if (!CAPTURE_KINDS.has(routedTo.type) || !routeId) {
    throw new Error('Capture route must be valid.');
  }
  if (aiKind !== undefined && !CAPTURE_KINDS.has(aiKind)) {
    throw new Error('Capture kind must be valid.');
  }
  const summary = aiSummary?.trim();
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
