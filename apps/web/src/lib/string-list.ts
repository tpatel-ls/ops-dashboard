export function normalizeStringList(
  value: unknown,
  errorMessage: string,
  options: { caseInsensitive?: boolean; maxItems?: number; maxItemLength?: number } = {},
): string[] {
  const maxItems = options.maxItems ?? 100;
  const maxItemLength = options.maxItemLength ?? 2_048;
  if (
    !Array.isArray(value) ||
    value.length > maxItems ||
    value.some((item) => typeof item !== 'string' || Array.from(item.trim()).length > maxItemLength)
  ) {
    throw new Error(errorMessage);
  }
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const text = item.trim();
    if (!text) continue;
    const key = options.caseInsensitive ? text.normalize('NFKC').toLocaleLowerCase('en-US') : text;
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(text);
    }
  }
  return normalized;
}
