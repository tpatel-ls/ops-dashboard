'use client';

import type { CaptureKind, CaptureSource } from '@ops-dashboard/core';
import { pushNotification } from '@/lib/feed';
import { processBrainDump } from '@/lib/route-items';

interface CaptureResult {
  kind: CaptureKind;
  id: string;
}

/** Cap per-dump notifications so a long ramble does not spam the feed. */
const MAX_NOTIFICATIONS = 3;

/**
 * Thin wrapper over the universal brain-dump router, kept for the existing
 * single-line capture callers (top bar, command palette). Returns the first
 * routed item; the full trail lives in the Inbox.
 */
export async function runCapture(
  raw: string,
  source: CaptureSource = 'text',
): Promise<CaptureResult> {
  const results = await processBrainDump(raw, source);

  await Promise.allSettled(
    results.slice(0, MAX_NOTIFICATIONS).map((r) =>
      pushNotification({
        title: `Captured: ${r.title}`,
        kind: 'capture',
        refType: r.kind,
        refId: r.recordId,
      }),
    ),
  );

  const first = results[0];
  return first ? { kind: first.kind, id: first.recordId } : { kind: 'task', id: '' };
}
