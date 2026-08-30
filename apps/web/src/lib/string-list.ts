export function normalizeStringList(
  value: unknown,
  errorMessage: string,
  options: { caseInsensitive?: boolean } = {},
): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
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
