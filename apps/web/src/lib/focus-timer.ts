export function elapsedSessionMs(carriedMs: number, startedAt: number | null, now: number): number {
  const carried = Number.isFinite(carriedMs) ? Math.max(0, carriedMs) : 0;
  if (startedAt === null || !Number.isFinite(startedAt) || !Number.isFinite(now)) return carried;
  return carried + Math.max(0, now - startedAt);
}

export function elapsedSessionMinutes(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return Math.round(elapsedMs / 60_000);
}
