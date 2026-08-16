export const SYNC_EPOCH = '1970-01-01T00:00:00Z';

export interface SyncCursorCache {
  read: (raw: string | null) => Record<string, string>;
  store: (cursors: Record<string, string>) => string;
}

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

export function createSyncCursorCache(): SyncCursorCache {
  const cached: Record<string, string> = {};
  return {
    read(raw) {
      const stored = parseSyncCursors(raw);
      for (const [table, cursor] of Object.entries(stored)) {
        if (!cached[table] || cursor > cached[table]) cached[table] = cursor;
      }
      return { ...cached };
    },
    store(cursors) {
      const normalized = parseSyncCursors(JSON.stringify(cursors));
      for (const [table, cursor] of Object.entries(normalized)) {
        if (!cached[table] || cursor > cached[table]) cached[table] = cursor;
      }
      return JSON.stringify(cached);
    },
  };
}

export function overlappedCursor(cursor: string, overlapMs: number): string {
  if (cursor === SYNC_EPOCH) return SYNC_EPOCH;
  const timestamp = Date.parse(cursor);
  if (!Number.isFinite(timestamp)) return SYNC_EPOCH;
  const safeOverlapMs = Number.isFinite(overlapMs) ? Math.max(0, overlapMs) : 0;
  return new Date(Math.max(Date.parse(SYNC_EPOCH), timestamp - safeOverlapMs)).toISOString();
}
