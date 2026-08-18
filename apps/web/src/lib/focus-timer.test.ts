import { describe, expect, it } from 'vitest';
import { accumulatedFocusMinutes, elapsedSessionMinutes, elapsedSessionMs } from './focus-timer';

describe('focus timer elapsed time', () => {
  it('adds resumed work to time carried across a pause', () => {
    const firstSegment = elapsedSessionMs(0, 0, 60_000);
    const fullSession = elapsedSessionMs(firstSegment, 120_000, 180_000);

    expect(fullSession).toBe(120_000);
    expect(elapsedSessionMinutes(fullSession)).toBe(2);
  });

  it('ignores invalid and backward clock values', () => {
    expect(elapsedSessionMs(Number.NaN, 100, 50)).toBe(0);
    expect(elapsedSessionMinutes(Number.NaN)).toBe(0);
  });

  it('adds an ended partial session to prior task time', () => {
    expect(accumulatedFocusMinutes(12, 4 * 60_000)).toBe(16);
    expect(accumulatedFocusMinutes(Number.NaN, 60_000)).toBe(1);
    expect(accumulatedFocusMinutes(Number.MAX_SAFE_INTEGER, 60_000)).toBe(Number.MAX_SAFE_INTEGER);
  });
});
