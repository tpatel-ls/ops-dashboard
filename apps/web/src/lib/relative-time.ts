import { differenceInCalendarDays, formatDistance, isValid, parseISO, startOfDay } from 'date-fns';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Relative label for an ISO timestamp, such as "3 days ago".
 *
 * Returns undefined when the value is missing or does not parse. date-fns
 * `formatDistanceToNow` throws `RangeError: Invalid time value` on an Invalid
 * Date, and these timestamps come from imported and synced records, so a
 * caller that formats one inline loses its whole view to a single bad row.
 *
 * A date-only value (a person interaction logged with a picked date) names a
 * calendar day, not an instant. Measured from its local midnight, one logged
 * for today read "about 16 hours ago" by the evening, so it is counted in
 * calendar days instead: "today", "yesterday", "3 days ago".
 */
export function relativeTimeLabel(value: unknown, now: Date = new Date()): string | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  const parsed = parseISO(value);
  if (!isValid(parsed)) return undefined;
  if (DATE_ONLY.test(value)) {
    const days = differenceInCalendarDays(parsed, now);
    if (days === 0) return 'today';
    if (days === -1) return 'yesterday';
    if (days === 1) return 'tomorrow';
    return formatDistance(parsed, startOfDay(now), { addSuffix: true });
  }
  return formatDistance(parsed, now, { addSuffix: true });
}
