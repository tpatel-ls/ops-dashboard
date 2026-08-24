import { describe, expect, it } from 'vitest';
import { compareCaptureRecency } from './captures';

describe('compareCaptureRecency', () => {
  it('orders offset timestamps by instant and malformed values last', () => {
    const captures = [
      { id: 'invalid', createdAt: 'not-a-timestamp' },
      { id: 'earlier', createdAt: '2026-08-24T14:00:00Z' },
      { id: 'later', createdAt: '2026-08-24T09:30:00-05:00' },
    ];

    expect(captures.sort(compareCaptureRecency).map((capture) => capture.id)).toEqual([
      'later',
      'earlier',
      'invalid',
    ]);
  });
});
