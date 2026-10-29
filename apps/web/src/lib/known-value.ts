/**
 * `value` when it is one of `allowed`, otherwise `fallback`.
 *
 * Views that render one section per known status, stage, or time of day used
 * to fill each section with an exact match, so a record holding any other
 * value landed in no section and disappeared without a trace. Postgres stores
 * these fields as plain text with a default but no check constraint, and
 * synced rows reach Dexie through `fromRow` without validation, so a value a
 * newer version added (or a missing one) is reachable. Grouping through this
 * puts such a record in the column's default section, where it can still be
 * seen and edited.
 */
export function knownValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}
