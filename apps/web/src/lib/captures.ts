'use client';

import type { Capture, CaptureKind, CaptureRoute, CaptureSource } from '@drift/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

export function createCapture(raw: string, source: CaptureSource = 'text'): Promise<Capture> {
  return putRecord('captures', newRecord<Capture>({ raw, source, status: 'pending' }));
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
