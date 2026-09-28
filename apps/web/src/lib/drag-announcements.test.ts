import type { Active, Over } from '@dnd-kit/core';
import { describe, expect, it } from 'vitest';
import { DRAG_ANNOUNCEMENTS } from './drag-announcements';

function node(id: string, label?: string) {
  return { id, data: { current: label === undefined ? {} : { label } } };
}

const active = node('0f5c2a8e-task-uuid', 'Draft launch notes') as unknown as Active;
const over = node('doing', 'In progress') as unknown as Over;

describe('DRAG_ANNOUNCEMENTS', () => {
  it('names the task and the drop area rather than their ids', () => {
    expect(DRAG_ANNOUNCEMENTS.onDragStart({ active })).toBe('Picked up Draft launch notes.');
    expect(DRAG_ANNOUNCEMENTS.onDragOver({ active, over })).toBe(
      'Draft launch notes is over In progress.',
    );
    expect(DRAG_ANNOUNCEMENTS.onDragEnd({ active, over })).toBe(
      'Draft launch notes was dropped on In progress.',
    );
    expect(DRAG_ANNOUNCEMENTS.onDragCancel({ active, over: null })).toBe(
      'Moving Draft launch notes was cancelled.',
    );
  });

  it('says a drop outside every area did not move the task', () => {
    expect(DRAG_ANNOUNCEMENTS.onDragEnd({ active, over: null })).toBe(
      'Draft launch notes was dropped outside any drop area and did not move.',
    );
  });

  it('falls back to generic wording instead of reading an unlabelled id', () => {
    const unlabelled = node('0f5c2a8e-task-uuid') as unknown as Active;
    const text = DRAG_ANNOUNCEMENTS.onDragOver({
      active: unlabelled,
      over: node('2026-09-28') as unknown as Over,
    });

    expect(text).toBe('Task is over a drop area.');
  });
});
