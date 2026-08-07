import type { CaptureKind, Priority } from '@ops-dashboard/core';
import { boundedText, boundedTextList } from './input';

const KINDS = new Set<CaptureKind>(['task', 'note', 'journal', 'event', 'person', 'quote']);

export interface TriageResult {
  kind: CaptureKind;
  title: string;
  notes?: string;
  dueText?: string;
  priority?: Priority;
  tags?: string[];
  domainHint?: string;
  reminderText?: string;
}

export function normalizeTriageResult(value: unknown): TriageResult | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const title = boundedText(input.title, 500);
  if (!title) return null;
  const requestedKind = boundedText(input.kind, 20).toLowerCase() as CaptureKind;
  const kind = KINDS.has(requestedKind) ? requestedKind : 'task';
  const notes = boundedText(input.notes, 2_000);
  const dueText = boundedText(input.dueText, 200);
  const tags = Array.from(
    new Set(boundedTextList(input.tags, 20, 64).map((tag) => tag.toLowerCase())),
  );
  const domainHint = boundedText(input.domainHint, 100);
  const reminderText = boundedText(input.reminderText, 200);
  const priority =
    typeof input.priority === 'number' &&
    Number.isInteger(input.priority) &&
    input.priority >= 0 &&
    input.priority <= 3
      ? (input.priority as Priority)
      : undefined;
  return {
    kind,
    title,
    ...(notes ? { notes } : {}),
    ...(dueText ? { dueText } : {}),
    ...(priority !== undefined ? { priority } : {}),
    ...(tags.length > 0 ? { tags } : {}),
    ...(domainHint ? { domainHint } : {}),
    ...(reminderText ? { reminderText } : {}),
  };
}
