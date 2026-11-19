'use client';

import type { CaptureKind, CaptureSource } from '@ops-dashboard/core';
import { excerpt } from '@/lib/excerpt';
import { pushNotification } from '@/lib/feed';
import { processBrainDump } from '@/lib/route-items';

interface CaptureResult {
  kind: CaptureKind;
  id: string;
}

/** Cap per-dump notifications so a long ramble does not spam the feed. */
const MAX_NOTIFICATIONS = 3;
/** `pushNotification` refuses a title over 200 characters; `excerpt` adds an ellipsis. */
const MAX_TITLE_EXCERPT = 200 - 'Captured: '.length - 1;

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

  // The notification is a courtesy; the item is already saved. Task titles run
  // to 500 characters, and pushNotification throws synchronously on a title
  // over its limit, which escaped allSettled and failed the whole capture, so
  // the caller reported an error for a saved item and a retry duplicated it.
  // Shorten the title, and run each push in an async callback so any throw
  // becomes a settled rejection.
  await Promise.allSettled(
    results.slice(0, MAX_NOTIFICATIONS).map(async (r) =>
      pushNotification({
        title: `Captured: ${excerpt(r.title, MAX_TITLE_EXCERPT)}`,
        kind: 'capture',
        refType: r.kind,
        refId: r.recordId,
      }),
    ),
  );

  const first = results[0];
  return first ? { kind: first.kind, id: first.recordId } : { kind: 'task', id: '' };
}
