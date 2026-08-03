import { localDay } from '@ops-dashboard/core';

export function boundedText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  const limit = Number.isFinite(maxLength) ? Math.max(0, Math.floor(maxLength)) : 0;
  return Array.from(value.trim()).slice(0, limit).join('');
}

export function dateOnlyText(value: unknown): string {
  if (typeof value !== 'string') return '';
  const date = value.trim();
  if (Array.from(date).length !== 10) return '';
  return localDay(date) === date ? date : '';
}

export function boundedTextList(value: unknown, maxItems: number, maxItemLength: number): string[] {
  if (!Array.isArray(value)) return [];
  const itemLimit = Number.isFinite(maxItems) ? Math.max(0, Math.floor(maxItems)) : 0;
  return value
    .map((item) => boundedText(item, maxItemLength))
    .filter(Boolean)
    .slice(0, itemLimit);
}
