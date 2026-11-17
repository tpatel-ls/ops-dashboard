/**
 * Newest-first ordering for the record lists the app sorts by timestamp.
 *
 * Six modules had each grown a byte-identical copy of this comparator, which
 * is more subtle than it looks: an unparseable timestamp must sort after
 * every valid one rather than poisoning the comparison with NaN, and equal
 * timestamps must fall back to the id so the order is stable across renders.
 * Fixing either rule meant finding all six copies.
 *
 * Records reach Dexie through `fromRow`, which casts without validating, so
 * the unparseable case is reachable rather than theoretical.
 */
/**
 * Milliseconds a recency comparison uses for `value`, or NaN.
 *
 * `Date.parse` reads a date-only value as UTC midnight, which in the Americas
 * is the previous evening, so a person interaction dated today sorted behind
 * one logged at 8pm yesterday and the people list called yesterday's the
 * latest. A date-only value is a local calendar day, so it counts from that
 * day's local midnight.
 */
export function recencyTimestamp(value: unknown): number {
  if (typeof value !== 'string') return Number.NaN;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (localDay(value) !== value) return Number.NaN;
    const [year, month, day] = value.split('-').map(Number);
    const midnight = new Date(0);
    midnight.setFullYear(year!, month! - 1, day!);
    midnight.setHours(0, 0, 0, 0);
    return midnight.getTime();
  }
  return Date.parse(value);
}

export function newestFirstBy<K extends string>(key: K) {
  return <T extends { id: string } & Record<K, string>>(left: T, right: T): number => {
    const leftTimestamp = recencyTimestamp(left[key]);
    const rightTimestamp = recencyTimestamp(right[key]);
    const leftValid = Number.isFinite(leftTimestamp);
    const rightValid = Number.isFinite(rightTimestamp);
    if (leftValid && rightValid && leftTimestamp !== rightTimestamp) {
      return rightTimestamp - leftTimestamp;
    }
    if (leftValid !== rightValid) return leftValid ? -1 : 1;
    return compareText(left.id, right.id);
  };
}

/** Newest first by `createdAt`, the shape most record lists use. */
export const compareCreatedAtRecency = newestFirstBy('createdAt');
import { localDay } from '@ops-dashboard/core';
import { compareText } from './compare-text';
