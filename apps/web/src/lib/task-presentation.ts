import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';

export function taskResultSummary(count: number, filtered: boolean): string {
  if (count === 0) return filtered ? 'No matching tasks' : 'No tasks';
  const noun = count === 1 ? 'task' : 'tasks';
  return filtered ? `${count} matching ${noun}` : `${count} ${noun}`;
}

export function taskDateLabel(date: string, today: string, done: boolean): string {
  const day = date.slice(0, 10);
  const parsed = parseISO(day);
  if (!isValid(parsed)) return date;

  const offset = differenceInCalendarDays(parsed, parseISO(today));
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  if (!done && offset === -1) return 'Yesterday';

  const calendarLabel = format(parsed, 'MMM d');
  return !done && offset < -1 ? `Overdue · ${calendarLabel}` : calendarLabel;
}
