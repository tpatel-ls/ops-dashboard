import { describe, expect, it } from 'vitest';
import { canDrainOutboxTable, nextRecordedAttempt, outboundRecordPayload } from './outbox';

describe('nextRecordedAttempt', () => {
  it('increments retry metadata without passing the display cap', () => {
    expect(nextRecordedAttempt(undefined, 12)).toBe(1);
    expect(nextRecordedAttempt(11, 12)).toBe(12);
    expect(nextRecordedAttempt(12, 12)).toBe(12);
  });

  it('never records negative or non-finite retry counts', () => {
    expect(nextRecordedAttempt(-4, 12)).toBe(1);
    expect(nextRecordedAttempt(Number.NaN, 12)).toBe(1);
    expect(nextRecordedAttempt(4, Number.NaN)).toBe(0);
    expect(nextRecordedAttempt(4, -1)).toBe(0);
  });
});

describe('outboundRecordPayload', () => {
  it('accepts records and rejects payloads that cannot become database rows', () => {
    const record = { id: 'task-1', title: 'Call supplier' };

    expect(outboundRecordPayload(record)).toBe(record);
    expect(outboundRecordPayload(null)).toBeUndefined();
    expect(outboundRecordPayload(['task-1'])).toBeUndefined();
    expect(outboundRecordPayload('task-1')).toBeUndefined();
  });
});

describe('canDrainOutboxTable', () => {
  it('keeps healthy tables eligible after another table fails', () => {
    const failed = new Set(['tasks']);

    expect(canDrainOutboxTable('tasks', failed)).toBe(false);
    expect(canDrainOutboxTable('projects', failed)).toBe(true);
  });
});
