/**
 * Chrono parses relative phrases in the server process's local wall-clock
 * frame (UTC in production, but whatever the machine uses under `next dev`).
 * Shift the reference instant so the server's local clock reads the caller's
 * wall clock before parsing, so phrases such as "tomorrow" do not cross a day
 * early or late for the caller.
 */
export function captureParserNow(tzOffsetMinutes: number | undefined, now = new Date()): Date {
  if (typeof tzOffsetMinutes !== 'number' || !Number.isFinite(tzOffsetMinutes)) return now;
  return new Date(now.getTime() + (now.getTimezoneOffset() - tzOffsetMinutes) * 60_000);
}

/**
 * Convert an instant the parser produced in the server's local frame (from a
 * reference built by `captureParserNow`) back into the caller's real instant:
 * the same wall-clock time, read in the caller's timezone.
 */
export function captureCallerInstant(iso: string, tzOffsetMinutes: number | undefined): string {
  if (typeof tzOffsetMinutes !== 'number' || !Number.isFinite(tzOffsetMinutes)) return iso;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Date(
    parsed.getTime() + (tzOffsetMinutes - parsed.getTimezoneOffset()) * 60_000,
  ).toISOString();
}
