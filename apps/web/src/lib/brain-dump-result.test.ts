import { describe, expect, it } from 'vitest';
import {
  boundedDraftText,
  MAX_ROUTED_ITEMS,
  MAX_ROUTED_TITLE_LENGTH,
  normalizeBrainDumpItem,
  normalizeBrainDumpItems,
} from './brain-dump-result';

describe('boundedDraftText', () => {
  it('trims, truncates by code point, and drops empty values', () => {
    expect(boundedDraftText('  spaced  ', 50)).toBe('spaced');
    expect(boundedDraftText('   ', 50)).toBeUndefined();
    expect(boundedDraftText(42, 50)).toBeUndefined();
    // Astral characters must not be split mid-surrogate.
    expect(boundedDraftText('😀😀😀', 2)).toBe('😀😀');
  });
});

describe('normalizeBrainDumpItem', () => {
  it('rejects values without a usable title', () => {
    expect(normalizeBrainDumpItem(null)).toBeNull();
    expect(normalizeBrainDumpItem('task')).toBeNull();
    expect(normalizeBrainDumpItem({})).toBeNull();
    expect(normalizeBrainDumpItem({ title: '   ' })).toBeNull();
  });

  it('keeps only recognized kinds and drops unknown ones', () => {
    expect(normalizeBrainDumpItem({ title: 'Ship it', kind: 'TASK' })?.kind).toBe('task');
    expect(normalizeBrainDumpItem({ title: 'Ship it', kind: 'invoice' })?.kind).toBeUndefined();
  });

  it('accepts only integer priorities inside the supported range', () => {
    expect(normalizeBrainDumpItem({ title: 'a', priority: 3 })?.priority).toBe(3);
    expect(normalizeBrainDumpItem({ title: 'a', priority: 4 })?.priority).toBeUndefined();
    expect(normalizeBrainDumpItem({ title: 'a', priority: 1.5 })?.priority).toBeUndefined();
    expect(normalizeBrainDumpItem({ title: 'a', priority: '2' })?.priority).toBeUndefined();
  });

  it('truncates an oversized title instead of dropping the item', () => {
    const item = normalizeBrainDumpItem({ title: 'x'.repeat(MAX_ROUTED_TITLE_LENGTH + 25) });
    expect(item?.title).toHaveLength(MAX_ROUTED_TITLE_LENGTH);
  });

  it('lowercases and de-duplicates tags', () => {
    expect(normalizeBrainDumpItem({ title: 'a', tags: ['Work', 'work', 'Home'] })?.tags).toEqual([
      'work',
      'home',
    ]);
    expect(normalizeBrainDumpItem({ title: 'a', tags: 'work' })?.tags).toBeUndefined();
    expect(normalizeBrainDumpItem({ title: 'a', tags: [] })?.tags).toBeUndefined();
  });

  it('omits absent optional fields rather than emitting undefined keys', () => {
    expect(normalizeBrainDumpItem({ title: 'Bare' })).toEqual({ title: 'Bare' });
  });

  it('keeps only known meal types and rounds nutrition estimates', () => {
    const food = normalizeBrainDumpItem({
      title: 'Lunch',
      food: {
        mealType: 'LUNCH',
        items: [{ name: 'Rice', quantity: '1 cup', calories: 205.6, protein: -4, fat: 1e9 }],
      },
    })?.food;
    expect(food?.mealType).toBe('lunch');
    expect(food?.items).toEqual([
      { name: 'Rice', quantity: '1 cup', calories: 206, protein: 0, fat: 1_000_000 },
    ]);
  });

  it('drops food entries and meal types it cannot use', () => {
    expect(
      normalizeBrainDumpItem({ title: 'a', food: { mealType: 'brunch' } })?.food,
    ).toBeUndefined();
    expect(normalizeBrainDumpItem({ title: 'a', food: [] })?.food).toBeUndefined();
    const items = normalizeBrainDumpItem({
      title: 'a',
      food: { mealType: 'snack', items: [{ quantity: '1 cup' }, null, { name: 'Nuts' }] },
    })?.food?.items;
    expect(items).toEqual([{ name: 'Nuts' }]);
  });
});

describe('normalizeBrainDumpItems', () => {
  it('returns an empty list for non-array payloads', () => {
    expect(normalizeBrainDumpItems(undefined)).toEqual([]);
    expect(normalizeBrainDumpItems({ items: [] })).toEqual([]);
  });

  it('skips unusable entries and caps the batch size', () => {
    expect(normalizeBrainDumpItems([{ title: 'Keep' }, {}, null, 'x'])).toEqual([
      { title: 'Keep' },
    ]);
    const many = Array.from({ length: MAX_ROUTED_ITEMS + 10 }, (_, i) => ({ title: `t${i}` }));
    expect(normalizeBrainDumpItems(many)).toHaveLength(MAX_ROUTED_ITEMS);
  });
});
