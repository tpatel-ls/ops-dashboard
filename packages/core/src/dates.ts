import { addDays, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';

export function isoDay(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function toISODate(d: Date): string {
  return isoDay(d);
}

/** Resolve a date-only value or timestamp to its browser-local calendar day. */
export function localDay(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(year!, month! - 1, day);
    return parsed.getFullYear() === year &&
      parsed.getMonth() === month! - 1 &&
      parsed.getDate() === day
      ? value
      : undefined;
  }
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? isoDay(parsed) : undefined;
}

export function todayIso(): string {
  return isoDay(new Date());
}

/**
 * First local calendar day of the week containing `anchor`, honouring the
 * user's `weekStartsOn` setting.
 *
 * The week views all derive their range from `startOfWeek`, but the habits
 * page open-coded a Monday-only offset, so "this week" there disagreed with
 * every other view whenever the user chose a Sunday start.
 */
export function weekStartIso(weekStartsOn: 0 | 1, anchor: Date = new Date()): string {
  return isoDay(startOfWeek(anchor, { weekStartsOn }));
}

export function weekDays(anchor: Date, weekStartsOn: 0 | 1): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function monthGrid(anchor: Date, weekStartsOn: 0 | 1): Date[] {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn });
  const days: Date[] = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }
  return days;
}
