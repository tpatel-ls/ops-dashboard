export const SYNC_EPOCH = '1970-01-01T00:00:00Z';

export function parseSyncCursors(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([table, value]): Array<[string, string]> => {
        if (typeof value !== 'string') return [];
        const timestamp = Date.parse(value);
        return Number.isFinite(timestamp) ? [[table, new Date(timestamp).toISOString()]] : [];
      }),
    );
  } catch {
    return {};
  }
}

export function overlappedCursor(cursor: string, overlapMs: number): string {
  if (cursor === SYNC_EPOCH) return SYNC_EPOCH;
  const timestamp = Date.parse(cursor);
  if (!Number.isFinite(timestamp)) return SYNC_EPOCH;
  const safeOverlapMs = Number.isFinite(overlapMs) ? Math.max(0, overlapMs) : 0;
  return new Date(Math.max(Date.parse(SYNC_EPOCH), timestamp - safeOverlapMs)).toISOString();
}
