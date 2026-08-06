'use client';

import type { Capture, CaptureKind, CaptureRoute, CaptureSource } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

export function createCapture(raw: string, source: CaptureSource = 'text'): Promise<Capture> {
  const normalizedRaw = raw.trim();
  if (!normalizedRaw) throw new Error('Capture text is required.');
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
) =>
  patchRecord<Capture>('captures', id, {
    status: 'triaged',
    routedTo,
    ...(aiKind ? { aiKind } : {}),
    ...(aiSummary ? { aiSummary } : {}),
  });

export const dismissCapture = (id: string) =>
  patchRecord<Capture>('captures', id, { status: 'dismissed' });

export const deleteCapture = (id: string) => softDeleteRecord<Capture>('captures', id);
