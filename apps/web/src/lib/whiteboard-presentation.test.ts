import { describe, expect, it } from 'vitest';
import { compareWhiteboardUpdates, whiteboardUpdatedLabel } from './whiteboard-presentation';

describe('whiteboard presentation', () => {
  it('sorts valid update times first and malformed records by name', () => {
    const records = [
      { id: 'zulu', name: 'Zulu', updatedAt: 'invalid' },
      { id: 'recent', name: 'Recent', updatedAt: '2026-08-02T12:00:00.000Z' },
      { id: 'alpha', name: 'Alpha', updatedAt: 'also-invalid' },
      { id: 'older', name: 'Older', updatedAt: '2026-08-01T12:00:00.000Z' },
    ];

    expect(records.sort(compareWhiteboardUpdates).map((record) => record.name)).toEqual([
      'Recent',
      'Older',
      'Alpha',
      'Zulu',
    ]);
  });

  it('breaks equal update timestamps by name and id', () => {
    const updatedAt = '2026-08-02T12:00:00.000Z';
    const records = [
      { id: 'bravo', name: 'Shared', updatedAt },
      { id: 'zulu', name: 'Zulu', updatedAt },
      { id: 'alpha', name: 'Shared', updatedAt },
    ];

    expect(records.sort(compareWhiteboardUpdates).map((record) => record.id)).toEqual([
      'alpha',
      'bravo',
      'zulu',
    ]);
  });

  it('uses a safe label for malformed update times', () => {
    expect(whiteboardUpdatedLabel('not-a-date')).toBe('Updated time unavailable');
    expect(whiteboardUpdatedLabel('2026-08-01T12:00:00.000Z')).toMatch(/^Updated /);
  });
});
