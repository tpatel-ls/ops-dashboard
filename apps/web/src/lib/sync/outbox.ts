export function nextRecordedAttempt(current: number | undefined, maximum: number): number {
  const attempts = Number.isFinite(current) ? Math.max(0, Math.floor(current!)) : 0;
  const cap = Number.isFinite(maximum) ? Math.max(0, Math.floor(maximum)) : 0;
  return Math.min(cap, attempts + 1);
}
