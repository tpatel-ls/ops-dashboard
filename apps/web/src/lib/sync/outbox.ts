export function nextRecordedAttempt(current: number | undefined, maximum: number): number {
  const attempts = Number.isFinite(current) ? Math.max(0, Math.floor(current!)) : 0;
  const cap = Number.isFinite(maximum) ? Math.max(0, Math.floor(maximum)) : 0;
  return Math.min(cap, attempts + 1);
}

export function outboundRecordPayload(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function canDrainOutboxTable(table: string, failedTables: ReadonlySet<string>): boolean {
  return !failedTables.has(table);
}
