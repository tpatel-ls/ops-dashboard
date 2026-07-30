const MAX_TIMEZONE_OFFSET_MINUTES = 14 * 60;

/**
 * Browser timezone offsets are finite minute counts within the civil timezone
 * range. Reject outliers so malformed API input cannot create invalid dates.
 */
export function normalizeTimezoneOffset(value: unknown): number | undefined {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    Math.abs(value) > MAX_TIMEZONE_OFFSET_MINUTES
  ) {
    return undefined;
  }
  return value;
}
