import type { Whiteboard } from '@ops-dashboard/core';
import { format } from 'date-fns';

function updatedTimestamp(value: string): number | undefined {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export function compareWhiteboardUpdates(
  a: Pick<Whiteboard, 'name' | 'updatedAt'>,
  b: Pick<Whiteboard, 'name' | 'updatedAt'>,
): number {
  const aUpdated = updatedTimestamp(a.updatedAt);
  const bUpdated = updatedTimestamp(b.updatedAt);
  if (aUpdated !== undefined && bUpdated !== undefined) return bUpdated - aUpdated;
  if (aUpdated !== undefined) return -1;
  if (bUpdated !== undefined) return 1;
  return a.name.localeCompare(b.name);
}

export function whiteboardUpdatedLabel(value: string): string {
  const timestamp = updatedTimestamp(value);
  return timestamp === undefined
    ? 'Updated time unavailable'
    : `Updated ${format(new Date(timestamp), 'MMM d, HH:mm')}`;
}
