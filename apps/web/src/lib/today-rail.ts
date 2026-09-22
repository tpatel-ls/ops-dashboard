import { localDay } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';

export function tasksForTodayRail(tasks: Task[], day: string): Task[] {
  if (localDay(day) !== day) return [];
  return tasks
    .filter((task) => {
      if (task.deletedAt || task.status === 'archived' || typeof task.startAt !== 'string') {
        return false;
      }
      return localDay(task.startAt) === day && Number.isFinite(Date.parse(task.startAt));
    })
    .sort((left, right) => {
      const time = Date.parse(left.startAt!) - Date.parse(right.startAt!);
      if (time !== 0) return time;
      const leftOrder = Number.isFinite(left.order) ? left.order : Number.POSITIVE_INFINITY;
      const rightOrder = Number.isFinite(right.order) ? right.order : Number.POSITIVE_INFINITY;
      const order = leftOrder - rightOrder;
      if (Number.isFinite(order) && order !== 0) return order;
      const title = left.title.localeCompare(right.title);
      return title !== 0 ? title : left.id.localeCompare(right.id);
    });
}

export function validRailEnd(startAt: string, endAt: string | undefined): Date | undefined {
  const start = Date.parse(startAt);
  const end = endAt ? Date.parse(endAt) : Number.NaN;
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? new Date(end) : undefined;
}

const LAST_HOUR = 23;

/** Hour index for an "HH:MM" settings value, or undefined when unusable. */
function settingHour(value: string): number | undefined {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return undefined;
  const hour = Number(match[1]);
  return Number.isInteger(hour) && hour >= 0 && hour <= LAST_HOUR ? hour : undefined;
}

function blockHour(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).getHours() : undefined;
}

/**
 * Hour a block's end contributes to the rail.
 *
 * The rail draws a single day, so an end that lands on a later calendar day
 * runs past the bottom of the rail rather than back up to its top. Taking its
 * raw hour read a 22:00 to 00:30 block as ending at hour 0 and dragged the
 * whole rail back to midnight, leaving 22 empty rows above the only block of
 * the day. Such a block is drawn to the last hour instead. An end that
 * precedes its own start is unusable and contributes nothing.
 */
function blockEndHour(startAt: string | undefined, endAt: string | undefined): number | undefined {
  const endHour = blockHour(endAt);
  if (endHour === undefined) return undefined;
  const startDay = localDay(startAt);
  const endDay = localDay(endAt);
  if (!startDay || !endDay || startDay === endDay) return endHour;
  return endDay > startDay ? LAST_HOUR : undefined;
}

/**
 * Inclusive hour range the rail draws.
 *
 * The settings page presents the workday as the thing that "drives the Today
 * rail", but the rail hardcoded 07:00 to 22:00 and ignored it. Simply
 * switching to the setting would be worse than the hardcoded range: the
 * default workday ends at 18:00, so an evening block would sit outside the
 * drawn hours entirely.
 *
 * So the workday sets the floor and the day's own blocks widen it. Anything
 * scheduled is always on the rail, and a user who narrows their workday gets
 * a shorter rail on the days that allow one. An unusable stored value falls
 * back to the range the rail used before.
 */
export function railHourRange(
  workdayStart: string,
  workdayEnd: string,
  blocks: Array<Pick<Task, 'startAt' | 'endAt'>> = [],
): { startHour: number; endHour: number } {
  const configuredStart = settingHour(workdayStart) ?? 7;
  const configuredEnd = settingHour(workdayEnd) ?? 22;
  let startHour = Math.min(configuredStart, configuredEnd);
  let endHour = Math.max(configuredStart, configuredEnd);

  for (const block of blocks) {
    // Only the start may pull the rail earlier. An end never can: it is always
    // at or after its own start.
    const start = blockHour(block.startAt);
    if (start !== undefined) {
      startHour = Math.min(startHour, start);
      endHour = Math.max(endHour, start);
    }
    const end = blockEndHour(block.startAt, block.endAt);
    if (end !== undefined) endHour = Math.max(endHour, end);
  }
  return { startHour, endHour };
}
