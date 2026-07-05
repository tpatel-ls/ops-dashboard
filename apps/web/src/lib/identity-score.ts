export interface IdentityScoreInput {
  bestStreak: number;
  weeklyActiveDays: number;
  activeDays: number;
  completedCount: number;
  journalCount: number;
  totalPoints: number;
}

export interface IdentitySectionScore {
  label: string;
  value: number;
  target: string;
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeIdentityScore(input: IdentityScoreInput): number {
  return clampScore(
    input.bestStreak * 3.5 +
      input.weeklyActiveDays * 7 +
      Math.min(input.totalPoints, 160) * 0.22,
  );
}

export function computeIdentitySections(input: IdentityScoreInput): IdentitySectionScore[] {
  return [
    {
      label: 'Consistency',
      value: clampScore((input.bestStreak / 31) * 100),
      target: '31-day streak',
    },
    {
      label: 'Execution',
      value: clampScore((input.completedCount / 14) * 100),
      target: '14 tasks/week',
    },
    {
      label: 'Reflection',
      value: clampScore((input.journalCount / 7) * 100),
      target: '7 entries/week',
    },
    {
      label: 'Year signal',
      value: clampScore((input.activeDays / 365) * 100),
      target: '365 active days',
    },
  ];
}

export function identityBand(score: number): string {
  if (score >= 90) return 'elite';
  if (score >= 75) return 'locked in';
  if (score >= 55) return 'building';
  if (score >= 30) return 'warming up';
  return 'cold start';
}
