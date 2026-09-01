import { describe, expect, it } from 'vitest';
import { parseQuickAdd } from './parse';

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

  it('deduplicates canonically equivalent hashtags', () => {
    const r = parseQuickAdd('Plan launch #Caf\u00e9 #Cafe\u0301 #ＬＳＧ #LSG', anchor);

    expect(r.tags).toEqual(['caf\u00e9', 'ｌｓｇ']);
    expect(r.title).toBe('Plan launch');
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
});
