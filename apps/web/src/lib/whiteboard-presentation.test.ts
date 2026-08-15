import { describe, expect, it } from 'vitest';
import { compareWhiteboardUpdates, whiteboardUpdatedLabel } from './whiteboard-presentation';

describe('whiteboard presentation', () => {
  it('sorts valid update times first and malformed records by name', () => {
    const records = [
      { name: 'Zulu', updatedAt: 'invalid' },
      { name: 'Recent', updatedAt: '2026-08-02T12:00:00.000Z' },
      { name: 'Alpha', updatedAt: 'also-invalid' },
      { name: 'Older', updatedAt: '2026-08-01T12:00:00.000Z' },
    ];

    expect(records.sort(compareWhiteboardUpdates).map((record) => record.name)).toEqual([
      'Recent',
      'Older',
      'Alpha',
      'Zulu',
    ]);
  });

  it('uses a safe label for malformed update times', () => {
    expect(whiteboardUpdatedLabel('not-a-date')).toBe('Updated time unavailable');
    expect(whiteboardUpdatedLabel('2026-08-01T12:00:00.000Z')).toMatch(/^Updated /);
  });
});
