const MAX_TIMEZONE_OFFSET_MINUTES = 14 * 60;

/**
 * Browser timezone offsets are finite minute counts within the civil timezone
 * range. Reject outliers so malformed API input cannot create invalid dates.
 */
export function normalizeTimezoneOffset(value: unknown): number | undefined {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    Math.abs(value) > MAX_TIMEZONE_OFFSET_MINUTES
  ) {
    return undefined;
  }
  return value;
}

const MAX_TIME_ZONE_LENGTH = 64;

/**
 * Offset, in `getTimezoneOffset()` minutes (positive west of UTC), of an IANA
 * zone such as `America/Chicago` at the given instant. Watch shortcuts can send
 * the zone name once instead of a fixed offset, which turns an hour wrong at
 * every daylight-saving change. Unknown or malformed zones return undefined.
 */
export function timeZoneOffsetMinutes(value: unknown, at = new Date()): number | undefined {
  if (typeof value !== 'string') return undefined;
  const timeZone = value.trim();
  if (!timeZone || timeZone.length > MAX_TIME_ZONE_LENGTH || Number.isNaN(at.getTime())) {
    return undefined;
  }
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).formatToParts(at);
  } catch {
    return undefined;
  }
  const field = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const wallAsUtc = Date.UTC(
    field('year'),
    field('month') - 1,
    field('day'),
    field('hour'),
    field('minute'),
  );
  const atMinute = Math.floor(at.getTime() / 60_000) * 60_000;
  return normalizeTimezoneOffset(Math.round((atMinute - wallAsUtc) / 60_000));
}
