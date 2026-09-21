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
export function newestFirstBy<K extends string>(key: K) {
  return <T extends { id: string } & Record<K, string>>(left: T, right: T): number => {
    const leftTimestamp = Date.parse(left[key]);
    const rightTimestamp = Date.parse(right[key]);
    const leftValid = Number.isFinite(leftTimestamp);
    const rightValid = Number.isFinite(rightTimestamp);
    if (leftValid && rightValid && leftTimestamp !== rightTimestamp) {
      return rightTimestamp - leftTimestamp;
    }
    if (leftValid !== rightValid) return leftValid ? -1 : 1;
    return left.id.localeCompare(right.id);
  };
}

/** Newest first by `createdAt`, the shape most record lists use. */
export const compareCreatedAtRecency = newestFirstBy('createdAt');
