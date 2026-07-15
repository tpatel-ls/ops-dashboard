export const SYNC_EPOCH = '1970-01-01T00:00:00Z';

export function parseSyncCursors(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
  } catch {
    return {};
  }
}

export function overlappedCursor(cursor: string, overlapMs: number): string {
  if (cursor === SYNC_EPOCH) return SYNC_EPOCH;
  const timestamp = Date.parse(cursor);
  if (!Number.isFinite(timestamp)) return SYNC_EPOCH;
  return new Date(Math.max(Date.parse(SYNC_EPOCH), timestamp - overlapMs)).toISOString();
}
