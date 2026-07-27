export function boundedText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  const limit = Number.isFinite(maxLength) ? Math.max(0, Math.floor(maxLength)) : 0;
  return value.trim().slice(0, limit);
}
