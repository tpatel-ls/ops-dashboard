/**
 * Chrono parses relative phrases in the server's UTC wall-clock frame. Shift
 * the reference instant into the caller's wall clock before parsing so phrases
 * such as "tomorrow" do not cross a day early for users west of UTC.
 */
export function captureParserNow(tzOffsetMinutes: number | undefined, now = new Date()): Date {
  if (typeof tzOffsetMinutes !== 'number' || !Number.isFinite(tzOffsetMinutes)) return now;
  return new Date(now.getTime() - tzOffsetMinutes * 60_000);
}
