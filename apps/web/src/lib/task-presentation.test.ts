import { describe, expect, it } from 'vitest';
import { taskResultSummary } from './task-presentation';

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
