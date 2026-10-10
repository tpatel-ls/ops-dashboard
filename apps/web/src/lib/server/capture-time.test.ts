import { describe, expect, it } from 'vitest';
import { parseQuickAdd } from '@ops-dashboard/core';
import { captureParserNow } from './capture-time';

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
