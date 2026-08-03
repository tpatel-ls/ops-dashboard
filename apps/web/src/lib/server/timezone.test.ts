import { describe, expect, it } from 'vitest';
import { normalizeTimezoneOffset } from './timezone';

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
