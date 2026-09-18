import { formatDistanceToNow, isValid, parseISO } from 'date-fns';

/**
 * Relative label for an ISO timestamp, such as "3 days ago".
 *
 * Returns undefined when the value is missing or does not parse. date-fns
 * `formatDistanceToNow` throws `RangeError: Invalid time value` on an Invalid
 * Date, and these timestamps come from imported and synced records, so a
 * caller that formats one inline loses its whole view to a single bad row.
 */
export function relativeTimeLabel(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? formatDistanceToNow(parsed, { addSuffix: true }) : undefined;
}
