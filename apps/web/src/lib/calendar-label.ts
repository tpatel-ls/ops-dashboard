import { localDay } from '@ops-dashboard/core';
import { format, parseISO } from 'date-fns';

/**
 * Short label for a local calendar day: "Jul 24", or "Jul 24, 2025" when the
 * day is not in the same year as `today`.
 *
 * Lists of tasks and projects keep dates from past and future years (an item
 * overdue since last spring, a deadline next year), and a bare "Mar 3" read as
 * this year's date. `today` must be a `YYYY-MM-DD` local day; when it is not,
 * the label keeps the year so it is never ambiguous.
 */
export function shortDayLabel(day: string, today: string): string {
  const parsed = parseISO(day);
  const sameYear = localDay(today) === today && today.slice(0, 4) === day.slice(0, 4);
  return format(parsed, sameYear ? 'MMM d' : 'MMM d, yyyy');
}

/**
 * Label for a week range such as "Nov 16 to Nov 22, 2026", naming both years
 * when the week crosses into the next one ("Dec 28, 2026 to Jan 3, 2027").
 *
 * The week views can page to any week. Without a year, the calendar header
 * read the same for a week this year and the same week a year later, and the
 * week board's range named only the end year.
 */
export function weekRangeLabel(start: Date, end: Date): string {
  return start.getFullYear() === end.getFullYear()
    ? `${format(start, 'MMM d')} to ${format(end, 'MMM d, yyyy')}`
    : `${format(start, 'MMM d, yyyy')} to ${format(end, 'MMM d, yyyy')}`;
}
