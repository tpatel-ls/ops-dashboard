export function normalizeStringList(value: unknown, errorMessage: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(errorMessage);
  }
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}
