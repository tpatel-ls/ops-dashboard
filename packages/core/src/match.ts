/**
 * Case-insensitive exact-name lookup, used to resolve AI-returned project and
 * routine names against the user's real records. The AI is told to echo names
 * exactly as provided, but casing/whitespace drift must not break routing.
 */
export function matchByName<T extends { name: string }>(
  items: T[],
  name: string | undefined,
): T | undefined {
  if (!name) return undefined;
  const needle = name.trim().toLowerCase();
  if (!needle) return undefined;
  return items.find((item) => item.name.trim().toLowerCase() === needle);
}
