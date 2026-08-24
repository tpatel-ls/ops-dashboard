import { describe, expect, it } from 'vitest';
import { compareNotificationRecency, notificationAge } from './feed';

describe('notificationAge', () => {
  const now = new Date('2026-08-21T14:00:00.000Z');

  it('formats valid notification timestamps relative to now', () => {
    expect(notificationAge('2026-08-21T13:00:00.000Z', now)).toBe('about 1 hour ago');
  });

  it('falls back safely for malformed timestamps', () => {
    expect(notificationAge('not-a-timestamp', now)).toBe('Recently');
    expect(notificationAge('2026-08-21T13:00:00.000Z', new Date('invalid'))).toBe('Recently');
  });
});

describe('compareNotificationRecency', () => {
  it('orders offset timestamps by instant and malformed values last', () => {
    const items = [
      { id: 'invalid', createdAt: 'not-a-date' },
      { id: 'later', createdAt: '2026-08-24T09:30:00-05:00' },
      { id: 'earlier', createdAt: '2026-08-24T14:00:00Z' },
    ];

    expect(items.sort(compareNotificationRecency).map((item) => item.id)).toEqual([
      'later',
      'earlier',
      'invalid',
    ]);
  });
});
