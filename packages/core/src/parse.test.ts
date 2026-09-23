import { describe, expect, it } from 'vitest';
import { parseQuickAdd, quickAddToTask } from './parse';

describe('parseQuickAdd', () => {
  const anchor = new Date('2026-04-26T10:00:00');

  it('extracts a plain title', () => {
    const r = parseQuickAdd('Write report', anchor);
    expect(r.title).toBe('Write report');
    expect(r.tags).toEqual([]);
    expect(r.priority).toBe(0);
    expect(r.scheduledFor).toBeUndefined();
  });

  it('extracts hashtags', () => {
    const r = parseQuickAdd('Pay bills #money #personal', anchor);
    expect(r.tags).toEqual(['money', 'personal']);
    expect(r.title).toBe('Pay bills');
  });

  it('deduplicates hashtags without changing their order', () => {
    const r = parseQuickAdd('Pay bills #Money #personal #money', anchor);
    expect(r.tags).toEqual(['money', 'personal']);
    expect(r.title).toBe('Pay bills');
  });

  it('preserves international letters in hashtags', () => {
    const r = parseQuickAdd('Plan trip #Québec #日本', anchor);

    expect(r.tags).toEqual(['québec', '日本']);
    expect(r.title).toBe('Plan trip');
  });

  it('deduplicates canonically equivalent hashtags and stores the canonical form', () => {
    const r = parseQuickAdd('Plan launch #Caf\u00e9 #Cafe\u0301 #ＬＳＧ #LSG', anchor);

    expect(r.tags).toEqual(['caf\u00e9', 'lsg']);
    expect(r.title).toBe('Plan launch');
  });

  it('stores the canonical form even when the decomposed spelling comes first', () => {
    // The capture and brain-dump paths canonicalize with NFKC, so quick-add has
    // to agree or the same tag reaches the tags index as two separate chips.
    const r = parseQuickAdd('Plan launch #Cafe\u0301', anchor);

    expect(r.tags).toEqual(['caf\u00e9']);
  });

  it('extracts priority bangs', () => {
    const r = parseQuickAdd('Ship release !!', anchor);
    expect(r.priority).toBe(2);
    expect(r.title).toBe('Ship release');
  });

  it('removes every priority marker and keeps the highest priority', () => {
    const r = parseQuickAdd('!! Ship release ! after review !!!', anchor);

    expect(r.priority).toBe(3);
    expect(r.title).toBe('Ship release after review');
  });

  it('parses tomorrow with time', () => {
    const r = parseQuickAdd('Call dentist tomorrow 3pm', anchor);
    expect(r.title.toLowerCase()).toContain('call dentist');
    expect(r.scheduledFor).toBe('2026-04-27');
    expect(r.startAt).toBeDefined();
    const start = new Date(r.startAt!);
    expect(start.getHours()).toBe(15);
    expect(start.getDate()).toBe(27);
  });

  it('handles combined directives', () => {
    const r = parseQuickAdd('Finish report tomorrow 3pm #work !!', anchor);
    expect(r.tags).toEqual(['work']);
    expect(r.priority).toBe(2);
    expect(r.scheduledFor).toBe('2026-04-27');
  });

  it('keeps plain text untouched when no date phrase is present', () => {
    const r = parseQuickAdd('Plan tomorrowy #focus', anchor);

    expect(r.title).toBe('Plan tomorrowy');
    expect(r.scheduledFor).toBeUndefined();
    expect(r.tags).toEqual(['focus']);
  });

  it('falls back to the original input when only directives are present', () => {
    const r = parseQuickAdd('!! #urgent');

    expect(r.title).toBe('!! #urgent');
    expect(r.tags).toEqual(['urgent']);
    expect(r.priority).toBe(2);
  });

  it('collapses the gap left by a hashtag removed from mid-title', () => {
    const r = parseQuickAdd('Call bob #work please', anchor);

    expect(r.title).toBe('Call bob please');
    expect(r.tags).toEqual(['work']);
  });

  it('ignores an incomplete hashtag token', () => {
    const r = parseQuickAdd('Plan this #');

    expect(r.tags).toEqual([]);
    expect(r.title).toBe('Plan this #');
  });
});

describe('quickAddToTask', () => {
  const anchor = new Date('2026-04-26T10:00:00');
  const base = { id: 'task-1', deviceId: 'device-1', order: 3 };

  it('carries every parsed field onto the new task', () => {
    const parsed = parseQuickAdd('Ship release #work !! tomorrow 3pm', anchor);
    const task = quickAddToTask(parsed, base);

    expect(task).toMatchObject({
      id: 'task-1',
      deviceId: 'device-1',
      order: 3,
      title: parsed.title,
      status: 'todo',
      priority: parsed.priority,
      tags: parsed.tags,
      scheduledFor: parsed.scheduledFor,
      startAt: parsed.startAt,
      dueAt: parsed.dueAt,
      version: 1,
    });
  });

  it('omits date fields the input never set rather than storing undefined', () => {
    const task = quickAddToTask(parseQuickAdd('Ship release', anchor), base);

    // The sync layer drops nulls but not present-and-undefined keys, so an
    // absent date has to stay absent rather than round-tripping as a key.
    for (const key of ['scheduledFor', 'startAt', 'endAt', 'dueAt']) {
      expect(Object.hasOwn(task, key)).toBe(false);
    }
  });

  it('starts a task with empty reminders and checklist and matching timestamps', () => {
    const task = quickAddToTask(parseQuickAdd('Ship release', anchor), base);

    expect(task.reminders).toEqual([]);
    expect(task.checklist).toEqual([]);
    expect(task.createdAt).toBe(task.updatedAt);
    expect(Number.isFinite(Date.parse(task.createdAt))).toBe(true);
  });
});
