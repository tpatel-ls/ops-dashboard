import { afterEach, describe, expect, it } from 'vitest';
import { parseQuickAdd } from '@ops-dashboard/core';
import { captureCallerInstant, captureParserNow } from './capture-time';

describe('captureParserNow', () => {
  it('parses relative days in the caller timezone near UTC midnight', () => {
    const serverNow = new Date('2026-08-24T04:30:00.000Z');
    const callerNow = captureParserNow(300, serverNow);

    expect(parseQuickAdd('Call tomorrow', callerNow).scheduledFor).toBe('2026-08-24');
  });

  it('keeps the server clock when the caller offset is unavailable', () => {
    const serverNow = new Date('2026-08-24T04:30:00.000Z');

    expect(captureParserNow(undefined, serverNow)).toBe(serverNow);
  });

  it('keeps the server clock for non-finite caller offsets', () => {
    const serverNow = new Date('2026-08-24T04:30:00.000Z');

    expect(captureParserNow(Number.NaN, serverNow)).toBe(serverNow);
    expect(captureParserNow(Number.POSITIVE_INFINITY, serverNow)).toBe(serverNow);
  });
});

describe('capture times on a server that is not in UTC', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it('parses relative days in the caller timezone, not the server zone', () => {
    process.env.TZ = 'America/Chicago';
    const serverNow = new Date('2026-08-24T02:00:00.000Z');
    // 02:00 on 24 August for a caller on UTC, while Chicago is still on the 23rd.
    const callerNow = captureParserNow(0, serverNow);

    expect(parseQuickAdd('Call tomorrow', callerNow).scheduledFor).toBe('2026-08-25');
  });

  it('turns a parsed wall-clock time into the caller instant', () => {
    process.env.TZ = 'America/Chicago';
    const serverNow = new Date('2026-08-24T04:30:00.000Z');
    const parsed = parseQuickAdd('Call tomorrow at 9am', captureParserNow(-540, serverNow));

    expect(parsed.scheduledFor).toBe('2026-08-25');
    // 09:00 in Tokyo on the 25th.
    expect(captureCallerInstant(parsed.startAt!, -540)).toBe('2026-08-25T00:00:00.000Z');
  });

  it('leaves the instant alone without a usable caller offset', () => {
    expect(captureCallerInstant('2026-08-25T09:00:00.000Z', undefined)).toBe(
      '2026-08-25T09:00:00.000Z',
    );
    expect(captureCallerInstant('not a date', 300)).toBe('not a date');
  });
});
