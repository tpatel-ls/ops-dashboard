import { describe, expect, it } from 'vitest';
import { nextRecordedAttempt } from './outbox';

describe('nextRecordedAttempt', () => {
  it('increments retry metadata without passing the display cap', () => {
    expect(nextRecordedAttempt(undefined, 12)).toBe(1);
    expect(nextRecordedAttempt(11, 12)).toBe(12);
    expect(nextRecordedAttempt(12, 12)).toBe(12);
  });

  it('never records negative or non-finite retry counts', () => {
    expect(nextRecordedAttempt(-4, 12)).toBe(1);
    expect(nextRecordedAttempt(Number.NaN, 12)).toBe(1);
    expect(nextRecordedAttempt(4, Number.NaN)).toBe(0);
    expect(nextRecordedAttempt(4, -1)).toBe(0);
  });
});
