import { describe, expect, it } from 'vitest';
import { parseQuickAdd, quickAddToTask } from './parse';

describe('parseQuickAdd', () => {
  it('rejects non-string input with a validation error', () => {
    expect(() => parseQuickAdd(42 as never, anchor)).toThrow('Quick add text must be a string.');
  });

  it('caps repeated priority markers at urgent', () => {
    expect(parseQuickAdd('Escalate !!!', anchor).priority).toBe(3);
  });
  it('accepts hyphens and underscores in tags', () => {
    expect(parseQuickAdd('Review #follow-up #next_step', anchor).tags).toEqual([
      'follow-up',
      'next_step',
    ]);
  });
  it('normalizes repeated whitespace in the title', () => {
    expect(parseQuickAdd('  Draft   brief  ', anchor).title).toBe('Draft brief');
  });
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

  it('reads priority marks glued to the date phrase', () => {
    const r = parseQuickAdd('Call bob tomorrow!!', anchor);

    expect(r.title).toBe('Call bob');
    expect(r.priority).toBe(2);
    expect(r.scheduledFor).toBe('2026-04-27');
  });

  it('closes up punctuation left where a date or tag was removed', () => {
    expect(parseQuickAdd('Call mom tomorrow.', anchor).title).toBe('Call mom.');
    expect(parseQuickAdd('Call mom tomorrow, then gym', anchor).title).toBe('Call mom, then gym');
    expect(parseQuickAdd('Buy milk - tomorrow', anchor).title).toBe('Buy milk');
    expect(parseQuickAdd('Email Kim re: budget, friday 3pm', anchor).title).toBe(
      'Email Kim re: budget',
    );
    expect(parseQuickAdd('Call bob #work, then email', anchor).title).toBe('Call bob, then email');
    expect(parseQuickAdd('Tomorrow: renew passport', anchor).title).toBe('renew passport');
  });

  it('leaves punctuation alone when nothing was removed', () => {
    expect(parseQuickAdd('Agenda:', anchor).title).toBe('Agenda:');
    expect(parseQuickAdd('-5 degrees , bring coat', anchor).title).toBe('-5 degrees , bring coat');
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

  it('sets an end time and strips the whole range from the title', () => {
    const r = parseQuickAdd('Standup tomorrow 9am-9:30am', anchor);
    expect(r.title).toBe('Standup');
    expect(r.startAt).toBe(new Date('2026-04-27T09:00:00').toISOString());
    expect(r.endAt).toBe(new Date('2026-04-27T09:30:00').toISOString());
    expect(r.dueAt).toBe(r.startAt);
  });

  it('drops an "at" or "on" left directly before the date it introduced', () => {
    expect(parseQuickAdd('Call at noon', anchor).title).toBe('Call');
    expect(parseQuickAdd('Dinner on Dec 5', anchor).title).toBe('Dinner');
    expect(parseQuickAdd('Meet at noon tomorrow', anchor).title).toBe('Meet');
  });

  it('drops a "by", "for", or "@" left directly before the date', () => {
    expect(parseQuickAdd('Ship v1 by 12/15', anchor).title).toBe('Ship v1');
    expect(parseQuickAdd('Order pizzas for noon', anchor).title).toBe('Order pizzas');
    expect(parseQuickAdd('Pick up kids @ 3:30pm', anchor).title).toBe('Pick up kids');
  });

  it('keeps a "by" or "for" that belongs to the title', () => {
    expect(parseQuickAdd('Stop by the bank tomorrow', anchor).title).toBe('Stop by the bank');
    expect(parseQuickAdd('Shop for gifts tomorrow', anchor).title).toBe('Shop for gifts');
  });

  it('keeps an "at" or "on" that belongs to the title or ends a word', () => {
    expect(parseQuickAdd('Look at report tomorrow', anchor).title).toBe('Look at report');
    expect(parseQuickAdd('Leave on time tomorrow', anchor).title).toBe('Leave on time');
    expect(parseQuickAdd('Paint the wagon on Dec 5', anchor).title).toBe('Paint the wagon');
  });

  it('schedules a date-only phrase without inventing a time', () => {
    const r = parseQuickAdd('Renew passport tomorrow', anchor);
    expect(r.title).toBe('Renew passport');
    expect(r.scheduledFor).toBe('2026-04-27');
    expect(r).not.toHaveProperty('startAt');
    expect(r).not.toHaveProperty('endAt');
    expect(r).not.toHaveProperty('dueAt');
  });

  it('does not schedule a bare month name', () => {
    const lunch = parseQuickAdd('Lunch with April', anchor);
    expect(lunch.title).toBe('Lunch with April');
    expect(lunch).not.toHaveProperty('scheduledFor');

    const launch = parseQuickAdd('Plan the May launch tomorrow', anchor);
    expect(launch.title).toBe('Plan the May launch');
    expect(launch.scheduledFor).toBe('2026-04-27');
  });

  it('still schedules a month with a day or a relative month', () => {
    expect(parseQuickAdd('Dinner on Dec 5', anchor).scheduledFor).toBe('2026-12-05');
    expect(parseQuickAdd('Review budget next month', anchor).scheduledFor).toBe('2026-05-26');
  });

  it('leaves a date word inside quotation marks in the title', () => {
    const draft = parseQuickAdd('"Today" newsletter draft', anchor);
    expect(draft.title).toBe('"Today" newsletter draft');
    expect(draft).not.toHaveProperty('scheduledFor');

    const book = parseQuickAdd('Read \u201cTomorrow and Tomorrow\u201d friday', anchor);
    expect(book.title).toBe('Read \u201cTomorrow and Tomorrow\u201d');
    expect(book.scheduledFor).toBe('2026-05-01');
  });

  it('removes a parenthetical that only held the date', () => {
    expect(parseQuickAdd('Submit report (due friday)', anchor).title).toBe('Submit report');
    expect(parseQuickAdd('Renew passport (expires March 2027) !', anchor)).toMatchObject({
      title: 'Renew passport',
      scheduledFor: '2027-03-01',
      priority: 1,
    });
    expect(parseQuickAdd('Call (tomorrow) mom', anchor).title).toBe('Call mom');
  });

  it('keeps parentheses that hold more than the date', () => {
    expect(parseQuickAdd('Call mom (about the trip) tomorrow', anchor).title).toBe(
      'Call mom (about the trip)',
    );
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
    const parsed = parseQuickAdd('Ship release #work !! tomorrow 3pm-4pm', anchor);
    const task = quickAddToTask(parsed, base);

    // Guard the premise: a range is the only input that yields endAt.
    expect(parsed.endAt).toBe(new Date('2026-04-27T16:00:00').toISOString());

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
      endAt: parsed.endAt,
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
