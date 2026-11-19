import type { Whiteboard } from '@ops-dashboard/core';
import { format } from 'date-fns';
import { compareText } from './compare-text';

function updatedTimestamp(value: unknown): number | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export function compareWhiteboardUpdates(
  a: Pick<Whiteboard, 'id' | 'name' | 'updatedAt'>,
  b: Pick<Whiteboard, 'id' | 'name' | 'updatedAt'>,
): number {
  const aUpdated = updatedTimestamp(a.updatedAt);
  const bUpdated = updatedTimestamp(b.updatedAt);
  if (aUpdated !== undefined && bUpdated !== undefined) {
    if (aUpdated !== bUpdated) return bUpdated - aUpdated;
  } else if (aUpdated !== undefined) return -1;
  else if (bUpdated !== undefined) return 1;
  const nameOrder = compareText(a.name, b.name);
  return nameOrder !== 0 ? nameOrder : compareText(a.id, b.id);
}

export function whiteboardUpdatedLabel(value: unknown, now: Date = new Date()): string {
  const timestamp = updatedTimestamp(value);
  if (timestamp === undefined) return 'Updated time unavailable';
  const updated = new Date(timestamp);
  // Boards are kept for years; an update from another year names that year.
  const pattern =
    updated.getFullYear() === now.getFullYear() ? 'MMM d, HH:mm' : 'MMM d, yyyy, HH:mm';
  return `Updated ${format(updated, pattern)}`;
}
