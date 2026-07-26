import { describe, expect, it } from 'vitest';
import { taskDateLabel, taskResultSummary } from './task-presentation';

describe('taskResultSummary', () => {
  it.each([
    [0, false, 'No tasks'],
    [1, false, '1 task'],
    [4, false, '4 tasks'],
    [0, true, 'No matching tasks'],
    [1, true, '1 matching task'],
    [4, true, '4 matching tasks'],
  ] as const)('summarizes %i tasks with filtered=%s', (count, filtered, expected) => {
    expect(taskResultSummary(count, filtered)).toBe(expected);
  });
});

describe('taskDateLabel', () => {
  const today = '2026-07-26';

  it.each([
    ['2026-07-26', false, 'Today'],
    ['2026-07-27', false, 'Tomorrow'],
    ['2026-07-25', false, 'Yesterday'],
    ['2026-07-24', false, 'Overdue · Jul 24'],
    ['2026-07-30', false, 'Jul 30'],
    ['2026-07-24', true, 'Jul 24'],
  ] as const)('presents %s for done=%s', (date, done, expected) => {
    expect(taskDateLabel(date, today, done)).toBe(expected);
  });
});
