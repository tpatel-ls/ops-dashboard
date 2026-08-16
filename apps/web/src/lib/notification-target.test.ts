import { describe, expect, it } from 'vitest';
import { notificationTarget } from './notification-target';

describe('notificationTarget', () => {
  it('builds a task destination', () => {
    expect(notificationTarget(' task-1 ')).toBe('/today?task=task-1');
  });

  it('encodes notification data as one query value', () => {
    expect(notificationTarget('task-1&capture=1')).toBe('/today?task=task-1%26capture%3D1');
  });

  it.each([undefined, null, '', 42])('uses Today for invalid task data: %s', (taskId) => {
    expect(notificationTarget(taskId)).toBe('/today');
  });

  it('bounds malformed notification identifiers', () => {
    expect(notificationTarget('x'.repeat(129))).toBe('/today');
    expect(notificationTarget('task-1\nredirect')).toBe('/today');
  });
});
