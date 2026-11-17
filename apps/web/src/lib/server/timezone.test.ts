import { describe, expect, it } from 'vitest';
import { normalizeTimezoneOffset, timeZoneOffsetMinutes } from './timezone';

describe('normalizeTimezoneOffset', () => {
  it('accepts real-world positive, negative, and fractional-hour offsets', () => {
    expect(normalizeTimezoneOffset(360)).toBe(360);
    expect(normalizeTimezoneOffset(-330)).toBe(-330);
    expect(normalizeTimezoneOffset(-765)).toBe(-765);
  });

  it('rejects malformed and out-of-range offsets', () => {
    expect(normalizeTimezoneOffset('360')).toBeUndefined();
    expect(normalizeTimezoneOffset(Number.NaN)).toBeUndefined();
    expect(normalizeTimezoneOffset(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(normalizeTimezoneOffset(90.5)).toBeUndefined();
    expect(normalizeTimezoneOffset(841)).toBeUndefined();
    expect(normalizeTimezoneOffset(-841)).toBeUndefined();
  });
});

describe('timeZoneOffsetMinutes', () => {
  it('follows daylight saving for a named zone', () => {
    expect(timeZoneOffsetMinutes('America/Chicago', new Date('2026-07-01T12:00:00Z'))).toBe(300);
    expect(timeZoneOffsetMinutes('America/Chicago', new Date('2026-11-17T12:00:00Z'))).toBe(360);
    expect(timeZoneOffsetMinutes('Europe/London', new Date('2026-01-15T12:00:00Z'))).toBe(0);
  });

  it('handles zones east of UTC and fractional-hour zones', () => {
    expect(timeZoneOffsetMinutes('Asia/Kolkata', new Date('2026-07-01T12:00:00Z'))).toBe(-330);
    expect(timeZoneOffsetMinutes('Pacific/Chatham', new Date('2026-07-01T12:00:00Z'))).toBe(-765);
    expect(timeZoneOffsetMinutes(' UTC ', new Date('2026-07-01T12:34:56Z'))).toBe(0);
  });

  it('rejects unknown, malformed, and non-string zones', () => {
    expect(timeZoneOffsetMinutes('Mars/Olympus_Mons')).toBeUndefined();
    expect(timeZoneOffsetMinutes('')).toBeUndefined();
    expect(timeZoneOffsetMinutes('A'.repeat(65))).toBeUndefined();
    expect(timeZoneOffsetMinutes(300)).toBeUndefined();
    expect(timeZoneOffsetMinutes(undefined)).toBeUndefined();
    expect(timeZoneOffsetMinutes('UTC', new Date(Number.NaN))).toBeUndefined();
  });
});
