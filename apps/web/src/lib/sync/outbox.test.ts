import { describe, expect, it } from 'vitest';
import { nextRecordedAttempt } from './outbox';

describe('nextRecordedAttempt', () => {
  it('increments retry metadata without passing the display cap', () => {
    expect(nextRecordedAttempt(undefined, 12)).toBe(1);
    expect(nextRecordedAttempt(11, 12)).toBe(12);
    expect(nextRecordedAttempt(12, 12)).toBe(12);
  });
});
