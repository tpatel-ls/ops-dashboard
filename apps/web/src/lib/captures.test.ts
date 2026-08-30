import { describe, expect, it } from 'vitest';
import { compareCaptureRecency, createCapture, setCaptureRoute } from './captures';

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

describe('capture validation', () => {
  it('bounds raw capture text before persistence', () => {
    expect(() => createCapture('x'.repeat(8_001))).toThrow(
      'Capture text must contain at most 8000 characters',
    );
  });

  it('rejects oversized or unsafe route metadata', () => {
    expect(() => setCaptureRoute('capture-1', { type: 'task', id: 'x'.repeat(129) })).toThrow(
      'Capture route must be valid',
    );
    expect(() => setCaptureRoute('capture-1', { type: 'task', id: 'task\n1' })).toThrow(
      'Capture route must be valid',
    );
    expect(() =>
      setCaptureRoute('capture-1', { type: 'task', id: 'task-1' }, 'task', 'x'.repeat(501)),
    ).toThrow('Capture summary must contain at most 500 characters');
  });
});
