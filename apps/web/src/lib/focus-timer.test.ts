import { describe, expect, it } from 'vitest';
import { elapsedSessionMinutes, elapsedSessionMs } from './focus-timer';

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
});
