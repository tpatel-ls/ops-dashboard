export function elapsedSessionMs(carriedMs: number, startedAt: number | null, now: number): number {
  const carried = Number.isFinite(carriedMs)
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, carriedMs))
    : 0;
  if (startedAt === null || !Number.isFinite(startedAt) || !Number.isFinite(now)) return carried;
  return Math.min(Number.MAX_SAFE_INTEGER, carried + Math.max(0, now - startedAt));
}

export function elapsedSessionMinutes(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return Math.round(elapsedMs / 60_000);
}

export function accumulatedFocusMinutes(
  currentMinutes: number | undefined,
  elapsedMs: number,
): number {
  const current =
    Number.isSafeInteger(currentMinutes) && (currentMinutes ?? -1) >= 0 ? currentMinutes! : 0;
  const elapsed = elapsedSessionMinutes(elapsedMs);
  return Math.min(Number.MAX_SAFE_INTEGER, current + elapsed);
}
