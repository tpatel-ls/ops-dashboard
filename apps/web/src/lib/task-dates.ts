import { localDay } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';

type TaskDates = Pick<Task, 'scheduledFor' | 'dueAt'>;

/** Earliest valid local calendar day on which a task needs attention. */
export function taskCommitmentDay(task: TaskDates): string | undefined {
  const scheduled = localDay(task.scheduledFor);
  const due = localDay(task.dueAt);
  if (!scheduled) return due;
  if (!due) return scheduled;
  return scheduled < due ? scheduled : due;
}

export function taskNeedsAttentionBy(task: TaskDates, day: string): boolean {
  if (localDay(day) !== day) return false;
  const scheduled = localDay(task.scheduledFor);
  const due = localDay(task.dueAt);
  return scheduled === day || Boolean(due && due <= day);
}

export function taskIsOverdue(task: TaskDates, day: string): boolean {
  if (localDay(day) !== day) return false;
  const scheduled = localDay(task.scheduledFor);
  const due = localDay(task.dueAt);
  return Boolean((scheduled && scheduled < day) || (due && due < day));
}

export function summarizeTodayTasks(tasks: Task[], day: string) {
  const live = tasks.filter((task) => !task.deletedAt && task.status !== 'archived');
  const today = live.filter((task) => taskNeedsAttentionBy(task, day));
  return {
    total: today.length,
    done: today.filter((task) => task.status === 'done').length,
    overdue: live.filter(
      (task) => task.status !== 'done' && taskIsOverdue(task, day),
    ).length,
  };
}

export function compareTasksByCommitment(left: Task, right: Task): number {
  const leftDay = taskCommitmentDay(left) ?? '9999-12-31';
  const rightDay = taskCommitmentDay(right) ?? '9999-12-31';
  const dayOrder = leftDay.localeCompare(rightDay);
  if (dayOrder !== 0) return dayOrder;
  if (left.priority !== right.priority) return right.priority - left.priority;
  return left.id.localeCompare(right.id);
}

export function summarizeOpenTasks(tasks: Task[], day: string) {
  return {
    overdue: tasks.filter((task) => taskIsOverdue(task, day)).length,
    today: tasks.filter((task) => taskCommitmentDay(task) === day).length,
    high: tasks.filter((task) => task.priority >= 2).length,
  };
}
