import { describe, expect, it } from 'vitest';
import { nextBoardColumn, previousBoardColumn } from './board-actions';

describe('board keyboard movement', () => {
  it.each([
    ['todo', null],
    ['doing', 'todo'],
    ['done', 'doing'],
  ] as const)('moves left from %s to %s', (column, expected) => {
    expect(previousBoardColumn(column)).toBe(expected);
  });

  it.each([
    ['todo', 'doing'],
    ['doing', 'done'],
    ['done', null],
  ] as const)('moves right from %s to %s', (column, expected) => {
    expect(nextBoardColumn(column)).toBe(expected);
  });
});
