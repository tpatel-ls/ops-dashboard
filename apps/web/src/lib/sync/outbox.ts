export function nextRecordedAttempt(current: number | undefined, maximum: number): number {
  const attempts = Number.isFinite(current) ? Math.max(0, Math.floor(current!)) : 0;
  return Math.min(maximum, attempts + 1);
}
