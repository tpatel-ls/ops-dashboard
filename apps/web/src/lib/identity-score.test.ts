import { describe, expect, it } from 'vitest';
import {
  clampScore,
  computeIdentityScore,
  computeIdentitySections,
  identityBand,
} from './identity-score';

describe('identity score model', () => {
  it('clamps scores into the 0-100 range', () => {
    expect(clampScore(-12)).toBe(0);
    expect(clampScore(49.6)).toBe(50);
    expect(clampScore(999)).toBe(100);
    expect(clampScore(Number.NaN)).toBe(0);
  });

  it('rewards streak, weekly consistency, and capped activity volume', () => {
    expect(
      computeIdentityScore({
        bestStreak: 31,
        weeklyActiveDays: 7,
        activeDays: 200,
        completedCount: 14,
        journalCount: 7,
        totalPoints: 500,
      }),
    ).toBe(100);

    expect(
      computeIdentityScore({
        bestStreak: 0,
        weeklyActiveDays: 0,
        activeDays: 0,
        completedCount: 0,
        journalCount: 0,
        totalPoints: 0,
      }),
    ).toBe(0);
  });

  it('returns section scores with explicit targets', () => {
    const sections = computeIdentitySections({
      bestStreak: 16,
      weeklyActiveDays: 4,
      activeDays: 183,
      completedCount: 7,
      journalCount: 4,
      totalPoints: 80,
    });

    expect(sections.map((section) => section.label)).toEqual([
      'Consistency',
      'Execution',
      'Reflection',
      'Year signal',
    ]);
    expect(sections.map((section) => section.target)).toEqual([
      '31-day streak',
      '14 tasks/week',
      '7 entries/week',
      '365 active days',
    ]);
  });

  it('labels identity bands for the UI', () => {
    expect(identityBand(95)).toBe('elite');
    expect(identityBand(80)).toBe('locked in');
    expect(identityBand(60)).toBe('building');
    expect(identityBand(35)).toBe('warming up');
    expect(identityBand(10)).toBe('cold start');
  });
});
