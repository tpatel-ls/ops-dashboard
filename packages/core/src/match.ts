/**
 * Case-insensitive exact-name lookup, used to resolve AI-returned project and
 * routine names against the user's real records. The AI is told to echo names
 * exactly as provided, but casing/whitespace drift must not break routing.
 * Runs of whitespace inside a name count as one space: a routine saved as
 * "Morning  walk" came back from the model as "Morning walk" and never matched.
 */
export function matchByName<T extends { name: string }>(
  items: T[],
  name: string | undefined,
): T | undefined {
  if (!name) return undefined;
  const canonicalName = (value: unknown) =>
    typeof value === 'string'
      ? value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
      : '';
  const needle = canonicalName(name);
  if (!needle) return undefined;
  return items.find((item) => canonicalName(item?.name) === needle);
}
