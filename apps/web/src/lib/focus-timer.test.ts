import { describe, expect, it } from 'vitest';
import {
  accumulatedFocusMinutes,
  elapsedSessionMinutes,
  elapsedSessionMs,
  secondsRemaining,
} from './focus-timer';

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

  it('caps corrupted or overflowing elapsed durations', () => {
    expect(elapsedSessionMs(Number.MAX_VALUE, null, 0)).toBe(Number.MAX_SAFE_INTEGER);
    expect(elapsedSessionMs(Number.MAX_SAFE_INTEGER, 0, 1)).toBe(Number.MAX_SAFE_INTEGER);
    expect(elapsedSessionMs(0, -Number.MAX_VALUE, Number.MAX_VALUE)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('adds an ended partial session to prior task time', () => {
    expect(accumulatedFocusMinutes(12, 4 * 60_000)).toBe(16);
    expect(accumulatedFocusMinutes(Number.NaN, 60_000)).toBe(1);
    expect(accumulatedFocusMinutes(Number.MAX_SAFE_INTEGER, 60_000)).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('focus timer countdown', () => {
  it('counts whole seconds left, rounding a partial second up', () => {
    expect(secondsRemaining(10_000, 0)).toBe(10);
    expect(secondsRemaining(10_000, 9_001)).toBe(1);
    expect(secondsRemaining(10_000, 10_000)).toBe(0);
  });

  it('never goes negative after the deadline or on invalid clocks', () => {
    expect(secondsRemaining(10_000, 60_000)).toBe(0);
    expect(secondsRemaining(Number.NaN, 0)).toBe(0);
    expect(secondsRemaining(10_000, Number.POSITIVE_INFINITY)).toBe(0);
  });
});
