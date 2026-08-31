import { describe, expect, it } from 'vitest';
import { normalizeTriageResult } from './triage-result';

describe('normalizeTriageResult', () => {
  it('rejects results without a usable title', () => {
    expect(normalizeTriageResult({ kind: 'task', title: '   ' })).toBeNull();
    expect(normalizeTriageResult('task')).toBeNull();
  });

  it('bounds and normalizes untrusted model output', () => {
    expect(
      normalizeTriageResult({
        kind: 'INVENTED',
        title: '  Call the customer  ',
        priority: 99,
        tags: [' Sales ', 'sales', 42],
        notes: `  ${'x'.repeat(2_100)}  `,
      }),
    ).toEqual({
      kind: 'task',
      title: 'Call the customer',
      tags: ['sales'],
      notes: 'x'.repeat(2_000),
    });
  });

  it('deduplicates canonically equivalent Unicode tags', () => {
    expect(
      normalizeTriageResult({
        kind: 'task',
        title: 'Plan launch',
        tags: ['Caf\u00e9', 'Cafe\u0301', 'Ｐｌａｎｎｉｎｇ'],
      }),
    ).toMatchObject({ tags: ['café', 'planning'] });
  });
});
