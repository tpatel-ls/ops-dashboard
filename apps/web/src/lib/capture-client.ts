'use client';

import { getDb } from '@drift/core';
import type { CaptureKind } from '@drift/core';
import { createCapture, setCaptureRoute } from '@/lib/captures';
import { addTask } from '@/lib/tasks';
import { createJournalEntry } from '@/lib/journal';
import { pushNotification } from '@/lib/feed';
import type { CaptureSource } from '@drift/core';

interface TriageResult {
  kind: string;
  title: string;
  notes?: string;
  dueText?: string;
  priority?: number;
  tags?: string[];
  domainHint?: string;
  reminderText?: string;
}

interface CaptureResult {
  kind: CaptureKind;
  id: string;
}

export async function runCapture(
  raw: string,
  source: CaptureSource = 'text',
): Promise<CaptureResult> {
  // (a) Create the capture record immediately
  const cap = await createCapture(raw, source);

  // (b) POST to triage API
  let triaged = false;
  let kind: CaptureKind = 'task';
  let id = '';

  try {
    const res = await fetch('/api/triage', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ raw }),
    });
    const json = await res.json();

    if (json.ok && json.result) {
      const result = json.result as TriageResult;
      // What the AI classified it as (preserved on the capture) vs. what record
      // we actually created (route type).
      const aiKind: CaptureKind = (result.kind as CaptureKind) || 'task';
      let routeType: CaptureKind = 'task';

      // (c) Route to the right record type
      if (aiKind === 'journal') {
        const body = result.notes ? `${result.title}\n${result.notes}` : result.title;
        const entry = await createJournalEntry({ body, source: 'upload' });
        id = entry.id;
        routeType = 'journal';
      } else {
        // Find matching domain by case-insensitive name match
        let domainId: string | undefined;
        if (result.domainHint) {
          const domains = await getDb().domains.filter((d) => !d.deletedAt && !d.archivedAt).toArray();
          const hint = result.domainHint.toLowerCase();
          const match = domains.find((d) => d.name.toLowerCase() === hint);
          domainId = match?.id;
        }

        const titleInput = result.dueText
          ? `${result.title} ${result.dueText}`
          : result.title;

        const task = await addTask(titleInput, {
          priority: (result.priority as 0 | 1 | 2 | 3) || 0,
          tags: result.tags || [],
          ...(result.notes ? { notes: result.notes } : {}),
          ...(domainId ? { domainId } : {}),
        });
        id = task.id;
        routeType = 'task';
      }

      kind = routeType;

      // (d) Record the route on the capture (preserve the AI classification)
      await setCaptureRoute(cap.id, { type: routeType, id }, aiKind, result.title);

      // (e) Push notification
      await pushNotification({
        title: `Captured: ${result.title}`,
        kind: 'capture',
        refType: routeType,
        refId: id,
      });

      triaged = true;
    }
  } catch {
    // Network error / no AI key — fall through to fallback
  }

  if (!triaged) {
    // Fallback: just create a plain task
    const task = await addTask(raw);
    id = task.id;
    kind = 'task';

    await setCaptureRoute(cap.id, { type: 'task', id }, undefined);
    await pushNotification({
      title: `Captured: ${task.title}`,
      kind: 'capture',
      refType: 'task',
      refId: id,
    });
  }

  return { kind, id };
}
