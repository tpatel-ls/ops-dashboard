import { describe, expect, it } from 'vitest';
import { notificationAge } from './feed';

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
