import { describe, expect, it } from 'vitest';
import { parseQuickAdd, quickAddToTask } from './parse';

describe('parseQuickAdd', () => {
  it('rejects non-string input with a validation error', () => {
    expect(() => parseQuickAdd(42 as never, anchor)).toThrow('Quick add text must be a string.');
  });

  it('caps repeated priority markers at urgent', () => {
    expect(parseQuickAdd('Escalate !!!', anchor).priority).toBe(3);
    expect(parseQuickAdd('Escalate !!!!', anchor)).toMatchObject({
      title: 'Escalate',
      priority: 3,
    });
    expect(parseQuickAdd('Call mom tomorrow!!!!!', anchor)).toMatchObject({
      title: 'Call mom',
      priority: 3,
    });
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
    expect(parseQuickAdd('Ask Sam about the lease tomorrow?', anchor).title).toBe(
      'Ask Sam about the lease?',
    );
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

  it('drops a deadline word left directly before the date', () => {
    expect(parseQuickAdd('Finish slides before friday', anchor).title).toBe('Finish slides');
    expect(parseQuickAdd('Hold until monday', anchor).title).toBe('Hold');
    expect(parseQuickAdd('Submit report due friday', anchor).title).toBe('Submit report');
    expect(parseQuickAdd('Ship due tomorrow at 5pm', anchor).title).toBe('Ship');
    expect(parseQuickAdd('Send invoice no later than friday', anchor).title).toBe('Send invoice');
  });

  it('keeps a deadline word that belongs to the title', () => {
    expect(parseQuickAdd('Pay dues friday', anchor).title).toBe('Pay dues');
    expect(parseQuickAdd('Read Before Sunrise tomorrow', anchor).title).toBe('Read Before Sunrise');
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

  it('reads "sun", "sat", and "wed" on their own as words, not weekdays', () => {
    for (const input of ['Buy sun cream', 'Sat exam prep', 'Get wed invites printed']) {
      const r = parseQuickAdd(input, anchor);
      expect(r.title).toBe(input);
      expect(r).not.toHaveProperty('scheduledFor');
    }
  });

  it('schedules "tues" and "weds" like other weekday abbreviations', () => {
    expect(parseQuickAdd('Lunch tues', anchor)).toMatchObject({
      title: 'Lunch',
      scheduledFor: '2026-04-28',
    });
    expect(parseQuickAdd('Call Sam weds at 3pm', anchor)).toMatchObject({
      title: 'Call Sam',
      scheduledFor: '2026-04-29',
    });
    expect(parseQuickAdd('Review Tues. notes', anchor)).toMatchObject({
      title: 'Review notes',
      scheduledFor: '2026-04-28',
    });
  });

  it('still schedules other weekday abbreviations and qualified short names', () => {
    expect(parseQuickAdd('Pay mon', anchor)).toMatchObject({
      title: 'Pay',
      scheduledFor: '2026-04-27',
    });
    expect(parseQuickAdd('Ship this fri', anchor).scheduledFor).toBe('2026-05-01');
    expect(parseQuickAdd('Brunch next sun', anchor).title).toBe('Brunch');
    expect(parseQuickAdd('Party Saturday', anchor).scheduledFor).toBe('2026-05-02');
  });

  it('leaves a past or backward-counted date phrase in the title', () => {
    for (const input of [
      'Recap yesterday meeting',
      'Review last week notes',
      'Follow up on last friday call',
      'Log 2 days ago workout',
      'Call 2 hours before',
      'Call 30 minutes earlier',
      'Prep 2 days before friday',
      'Send 2 days before the launch',
    ]) {
      const r = parseQuickAdd(input, anchor);
      expect(r.title).toBe(input);
      expect(r).not.toHaveProperty('scheduledFor');
    }
  });

  it('leaves a possessive date in the title instead of scheduling it', () => {
    for (const input of [
      "Prep for tomorrow's demo",
      "Review Monday's notes",
      'Read today\u2019s paper',
      "Clean up after tonight's party",
    ]) {
      const r = parseQuickAdd(input, anchor);
      expect(r.title).toBe(input);
      expect(r).not.toHaveProperty('scheduledFor');
    }
    expect(parseQuickAdd("Plan tomorrow's agenda tomorrow", anchor)).toMatchObject({
      title: "Plan tomorrow's agenda",
      scheduledFor: '2026-04-27',
    });
  });

  it('schedules the future date when a past phrase comes first', () => {
    expect(parseQuickAdd('Pay last month invoice by friday', anchor)).toMatchObject({
      title: 'Pay last month invoice',
      scheduledFor: '2026-05-01',
    });
  });

  it('reads a fraction before a unit as an amount, not a date', () => {
    for (const input of [
      'Add 1/2 cup sugar',
      'Cook 1/4 lb beef',
      'Take 1/2 tablet',
      'Run 3/4 mile',
      'Fill 2/3 of tank',
    ]) {
      const r = parseQuickAdd(input, anchor);
      expect(r.title).toBe(input);
      expect(r.scheduledFor).toBeUndefined();
    }
    expect(parseQuickAdd('Add 1/2 cup sugar tomorrow', anchor)).toMatchObject({
      title: 'Add 1/2 cup sugar',
      scheduledFor: '2026-04-27',
    });
    expect(parseQuickAdd('Call mom on 5/12', anchor)).toMatchObject({
      title: 'Call mom',
      scheduledFor: '2026-05-12',
    });
    expect(parseQuickAdd('Vote 11/3', anchor).scheduledFor).toBe('2026-11-03');
  });

  it('reads 24/7 as part of the title, not as July 24', () => {
    const r = parseQuickAdd('Check 24/7 support tomorrow', anchor);
    expect(r.title).toBe('Check 24/7 support');
    expect(r.scheduledFor).toBe('2026-04-27');
    expect(parseQuickAdd('Plan 15/12', anchor).scheduledFor).toBe('2026-12-15');
  });

  it('does not schedule a length of time as a date', () => {
    for (const input of ['Read 5 minutes', 'Walk 2 hours', 'Fast 3 days', 'Read for an hour']) {
      const r = parseQuickAdd(input, anchor);
      expect(r.title).toBe(input);
      expect(r).not.toHaveProperty('scheduledFor');
      expect(r).not.toHaveProperty('startAt');
    }

    const run = parseQuickAdd('Run for 30 minutes tomorrow', anchor);
    expect(run.title).toBe('Run for 30 minutes');
    expect(run.scheduledFor).toBe('2026-04-27');
    expect(run).not.toHaveProperty('startAt');
  });

  it('still schedules a duration that says when', () => {
    expect(parseQuickAdd('Call in 2 days', anchor)).toMatchObject({
      title: 'Call',
      scheduledFor: '2026-04-28',
    });
    expect(parseQuickAdd('Ping within 2 days', anchor).scheduledFor).toBe('2026-04-28');
    expect(parseQuickAdd('Ship 2 weeks from now', anchor).scheduledFor).toBe('2026-05-10');
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

  it('reads "between" two times as a time range', () => {
    const at = (clock: string) => new Date(clock).toISOString();
    expect(parseQuickAdd('Call the bank between 2 and 3pm', anchor)).toMatchObject({
      title: 'Call the bank',
      startAt: at('2026-04-26T14:00:00'),
      endAt: at('2026-04-26T15:00:00'),
    });
    expect(parseQuickAdd('Delivery between 10am and noon tomorrow', anchor)).toMatchObject({
      title: 'Delivery',
      startAt: at('2026-04-27T10:00:00'),
      endAt: at('2026-04-27T12:00:00'),
    });
    expect(parseQuickAdd('Pick between 2 and 3 options', anchor).title).toBe(
      'Pick between 2 and 3 options',
    );
  });

  it('reads a length after a start time as the end of the block', () => {
    const at = (clock: string) => new Date(clock).toISOString();
    expect(parseQuickAdd('Meet Sam 2pm for an hour', anchor)).toMatchObject({
      title: 'Meet Sam',
      startAt: at('2026-04-26T14:00:00'),
      endAt: at('2026-04-26T15:00:00'),
    });
    expect(parseQuickAdd('Review tomorrow at 9am for 30 minutes #work', anchor)).toMatchObject({
      title: 'Review',
      endAt: at('2026-04-27T09:30:00'),
      tags: ['work'],
    });
    expect(parseQuickAdd('Call 4pm for half an hour', anchor).endAt).toBe(
      at('2026-04-26T16:30:00'),
    );
    expect(parseQuickAdd('Focus 1pm for 1 hour 30 min', anchor).endAt).toBe(
      at('2026-04-26T14:30:00'),
    );
    // A length with no start time still stays in the title.
    expect(parseQuickAdd('Read tomorrow for an hour', anchor)).toMatchObject({
      title: 'Read for an hour',
    });
    expect(parseQuickAdd('Read tomorrow for an hour', anchor)).not.toHaveProperty('endAt');
    // An explicit range keeps its own end.
    expect(parseQuickAdd('Meet 2pm-3pm for 10 minutes', anchor)).toMatchObject({
      title: 'Meet for 10 minutes',
      endAt: at('2026-04-26T15:00:00'),
    });
  });

  it('ends a range at the next time an hour without am or pm comes round', () => {
    const at = (clock: string) => new Date(clock).toISOString();
    expect(parseQuickAdd('Shift 8am-5', anchor)).toMatchObject({
      title: 'Shift',
      startAt: at('2026-04-27T08:00:00'),
      endAt: at('2026-04-27T17:00:00'),
    });
    expect(parseQuickAdd('Call 11am-1', anchor).endAt).toBe(at('2026-04-26T13:00:00'));
    expect(parseQuickAdd('Call 3pm-5', anchor).endAt).toBe(at('2026-04-26T17:00:00'));
    expect(parseQuickAdd('Party 11pm-1', anchor).endAt).toBe(at('2026-04-27T01:00:00'));
    expect(parseQuickAdd('Shift 08:00-22:00 tomorrow', anchor).endAt).toBe(
      at('2026-04-27T22:00:00'),
    );
    expect(parseQuickAdd('Call tomorrow @ 3pm-4pm', anchor).endAt).toBe(at('2026-04-27T16:00:00'));
    expect(parseQuickAdd('Call tomorrow @ 11am-1', anchor).endAt).toBe(at('2026-04-27T13:00:00'));
  });

  it('reads a time range that starts or ends at noon or midnight', () => {
    const at = (clock: string) => new Date(clock).toISOString();
    expect(parseQuickAdd('Call noon-1pm', anchor)).toMatchObject({
      title: 'Call',
      startAt: at('2026-04-26T12:00:00'),
      endAt: at('2026-04-26T13:00:00'),
    });
    expect(parseQuickAdd('Deep work 9am to noon tomorrow', anchor)).toMatchObject({
      title: 'Deep work',
      startAt: at('2026-04-27T09:00:00'),
      endAt: at('2026-04-27T12:00:00'),
    });
    expect(parseQuickAdd('Lunch noon - 12:30pm', anchor)).toMatchObject({
      startAt: at('2026-04-26T12:00:00'),
      endAt: at('2026-04-26T12:30:00'),
    });
    expect(parseQuickAdd('Deploy 10pm-midnight', anchor)).toMatchObject({
      title: 'Deploy',
      startAt: at('2026-04-26T22:00:00'),
      endAt: at('2026-04-27T00:00:00'),
    });
    expect(parseQuickAdd('Set up the noon meeting', anchor).title).toBe('Set up the meeting');
  });

  it('reads an hour and a half as one length', () => {
    const at = (input: string) => {
      const r = parseQuickAdd(input, anchor);
      return [
        r.title,
        r.startAt && new Date(r.startAt).toString().slice(16, 21),
        r.endAt && new Date(r.endAt).toString().slice(16, 21),
      ];
    };
    expect(at('Call in an hour and a half')).toEqual(['Call', '11:30', undefined]);
    expect(at('Call in 2 hours and a half')).toEqual(['Call', '12:30', undefined]);
    expect(at('Call in 2 and a half hours')).toEqual(['Call', '12:30', undefined]);
    expect(at('Meet 2pm for an hour and a half')).toEqual(['Meet', '14:00', '15:30']);
    expect(at('Meet 2pm for 2 hours and a half')).toEqual(['Meet', '14:00', '16:30']);
    expect(at('Meet 2pm for 2 and a half hours')).toEqual(['Meet', '14:00', '16:30']);
  });

  it('schedules the end of a month or year on its last day', () => {
    for (const [input, title, day] of [
      ['Pay rent end of month', 'Pay rent', '2026-04-30'],
      ['Pay rent by end of the month', 'Pay rent', '2026-04-30'],
      ['Pay rent by the end of this month', 'Pay rent', '2026-04-30'],
      ['Pay by end of next month', 'Pay', '2026-05-31'],
      ['File taxes end of year', 'File taxes', '2026-12-31'],
      ['File taxes end of next year', 'File taxes', '2027-12-31'],
    ] as const) {
      expect(parseQuickAdd(input, anchor)).toMatchObject({ title, scheduledFor: day });
    }
    expect(parseQuickAdd('Pay end of month', new Date('2026-12-15T10:00:00')).scheduledFor).toBe(
      '2026-12-31',
    );
    expect(
      parseQuickAdd('Pay end of next month', new Date('2026-12-15T10:00:00')).scheduledFor,
    ).toBe('2027-01-31');
  });

  it('schedules "first of the month" on the next 1st', () => {
    for (const [input, title, day] of [
      ['Pay rent first of the month', 'Pay rent', '2026-05-01'],
      ['Pay rent on the 1st of the month', 'Pay rent', '2026-05-01'],
      ['Pay rent by the first of next month', 'Pay rent', '2026-05-01'],
    ] as const) {
      expect(parseQuickAdd(input, anchor)).toMatchObject({ title, scheduledFor: day });
    }
    const firstOfDecember = new Date('2026-12-01T10:00:00');
    expect(parseQuickAdd('Pay rent first of the month', firstOfDecember).scheduledFor).toBe(
      '2026-12-01',
    );
    expect(parseQuickAdd('Pay rent first of next month', firstOfDecember).scheduledFor).toBe(
      '2027-01-01',
    );
    // A time already past on the 1st stays on that day, not a year out.
    expect(parseQuickAdd('Invoice 1st of the month at 9am', firstOfDecember).scheduledFor).toBe(
      '2026-12-01',
    );
  });

  it('leaves the end of a week in the title', () => {
    for (const input of ['Ship end of next week', 'Ship by the end of this week']) {
      const r = parseQuickAdd(input, anchor);
      expect(r.title).toBe(input);
      expect(r.scheduledFor).toBeUndefined();
    }
  });

  it('reads "wk", "wks", and "yrs" like the full units', () => {
    for (const [input, title, day] of [
      ['Pay bill in 2 wks', 'Pay bill', '2026-05-10'],
      ['Pay bill in 1 wk', 'Pay bill', '2026-05-03'],
      ['Pay bill in a wk', 'Pay bill', '2026-05-03'],
      ['Pay bill 2 wks from now', 'Pay bill', '2026-05-10'],
      ['Pay bill 2 wks from today', 'Pay bill', '2026-05-10'],
      ['Renew in 2 yrs', 'Renew', '2028-04-26'],
    ] as const) {
      const r = parseQuickAdd(input, anchor);
      expect(r).toMatchObject({ title, scheduledFor: day });
      expect(r.startAt).toBeUndefined();
    }
    expect(parseQuickAdd('Ship wks', anchor).title).toBe('Ship wks');
  });

  it('reads "day after tomorrow" and "from today" offsets', () => {
    expect(parseQuickAdd('Lunch day after tomorrow', anchor)).toMatchObject({
      title: 'Lunch',
      scheduledFor: '2026-04-28',
    });
    expect(parseQuickAdd('Lunch the day after tomorrow', anchor)).toMatchObject({
      title: 'Lunch',
      scheduledFor: '2026-04-28',
    });
    expect(parseQuickAdd('Meet 3 days from today', anchor)).toMatchObject({
      title: 'Meet',
      scheduledFor: '2026-04-29',
    });
    expect(parseQuickAdd('Meet two weeks from today', anchor)).toMatchObject({
      title: 'Meet',
      scheduledFor: '2026-05-10',
    });
  });

  it('schedules "<weekday> after next" a week after the next one', () => {
    // The anchor is Sunday 2026-04-26, so the next Friday is 2026-05-01.
    for (const [input, title, day] of [
      ['Demo friday after next', 'Demo', '2026-05-08'],
      ['Demo the friday after next', 'Demo', '2026-05-08'],
      ['Lunch tues after next', 'Lunch', '2026-05-05'],
      ['Review sunday after next', 'Review', '2026-05-10'],
    ] as const) {
      expect(parseQuickAdd(input, anchor)).toMatchObject({ title, scheduledFor: day });
    }
    const timed = parseQuickAdd('Pickup Monday after next at 3pm', anchor);
    expect(timed).toMatchObject({ title: 'Pickup', scheduledFor: '2026-05-04' });
    expect(new Date(timed.startAt ?? '').getHours()).toBe(15);
    // On a Friday, the next Friday is a week out, so "after next" is two.
    expect(parseQuickAdd('Demo friday after next', new Date('2026-05-01T10:00:00'))).toMatchObject({
      title: 'Demo',
      scheduledFor: '2026-05-15',
    });
  });

  it('schedules "Tuesday week" a week from that Tuesday', () => {
    // The anchor is Sunday 2026-04-26.
    for (const [input, title, day] of [
      ['Review Tuesday week', 'Review', '2026-05-05'],
      ['Lunch weds week', 'Lunch', '2026-05-06'],
      // On the day itself, it is a week from today.
      ['Call sunday week', 'Call', '2026-05-03'],
    ] as const) {
      expect(parseQuickAdd(input, anchor)).toMatchObject({ title, scheduledFor: day });
    }
    const timed = parseQuickAdd('Call friday week at 3pm', anchor);
    expect(timed).toMatchObject({ title: 'Call', scheduledFor: '2026-05-08' });
    expect(new Date(timed.startAt ?? '').getHours()).toBe(15);
  });

  it('counts "2 weeks from friday" from that day', () => {
    // The anchor is Sunday 2026-04-26, so the next Friday is 2026-05-01.
    for (const [input, title, day] of [
      ['Party 2 weeks from friday', 'Party', '2026-05-15'],
      ['Pay a week from friday', 'Pay', '2026-05-08'],
      ['Call 3 days from monday', 'Call', '2026-04-30'],
      ['Ship two weeks from tomorrow', 'Ship', '2026-05-11'],
      ['Pay 2 wks from tues', 'Pay', '2026-05-12'],
    ] as const) {
      expect(parseQuickAdd(input, anchor)).toMatchObject({ title, scheduledFor: day });
    }
    const timed = parseQuickAdd('Pay a week from friday at 9am', anchor);
    expect(timed).toMatchObject({ title: 'Pay', scheduledFor: '2026-05-08' });
    expect(new Date(timed.startAt ?? '').getHours()).toBe(9);
  });

  it('schedules the next "the 15th" when no month is given', () => {
    expect(parseQuickAdd('Pay bills on the 15th', anchor)).toMatchObject({
      title: 'Pay bills',
      scheduledFor: '2026-05-15',
    });
    expect(parseQuickAdd('Pay rent by the 30th', anchor).scheduledFor).toBe('2026-04-30');
    expect(parseQuickAdd('Review on the 26th', anchor).scheduledFor).toBe('2026-04-26');
    // April has no 31st, so the next one is in May.
    expect(parseQuickAdd('Close books on the 31st', anchor).scheduledFor).toBe('2026-05-31');
    const timed = parseQuickAdd('Call on the 3rd at 5pm', anchor);
    expect(timed).toMatchObject({ title: 'Call', scheduledFor: '2026-05-03' });
    expect(new Date(timed.startAt ?? '').getHours()).toBe(17);
    expect(parseQuickAdd('Pay on the 15th of June', anchor).scheduledFor).toBe('2026-06-15');
    for (const input of ['Meet on the 3rd floor', 'Finish the 2nd draft', 'Call on the 32nd']) {
      expect(parseQuickAdd(input, anchor)).toMatchObject({ title: input });
      expect(parseQuickAdd(input, anchor).scheduledFor).toBeUndefined();
    }
  });

  it('reads "quarter to", "quarter past", and "half past" as clock times', () => {
    const at = (input: string) => {
      const r = parseQuickAdd(input, anchor);
      return [r.title, r.startAt && new Date(r.startAt).toString().slice(16, 21)];
    };
    expect(at('Call quarter to 5pm')).toEqual(['Call', '16:45']);
    expect(at('Call at quarter past 9am tomorrow')).toEqual(['Call', '09:15']);
    expect(at('Meet half past 3pm')).toEqual(['Meet', '15:30']);
    expect(at('Lunch quarter to 1pm')).toEqual(['Lunch', '12:45']);
    expect(at('Break quarter to 12pm')).toEqual(['Break', '11:45']);
    // A count of quarters is not a time.
    expect(parseQuickAdd('Review quarter to date numbers', anchor).title).toBe(
      'Review quarter to date numbers',
    );
  });

  it('reads a time after "@" as part of the day before it', () => {
    const r = parseQuickAdd('Call mom tomorrow @ 5pm', anchor);
    expect(r.title).toBe('Call mom');
    expect(r.scheduledFor).toBe('2026-04-27');
    expect(r.startAt).toBe(new Date('2026-04-27T17:00:00').toISOString());
    expect(parseQuickAdd('Demo friday @10:30am', anchor).startAt).toBe(
      new Date('2026-05-01T10:30:00').toISOString(),
    );
    expect(parseQuickAdd('Call @ 3:30pm', anchor).startAt).toBe(
      new Date('2026-04-26T15:30:00').toISOString(),
    );
  });

  it('moves a time typed before a later day onto that day', () => {
    const at = (input: string) => {
      const r = parseQuickAdd(input, anchor);
      return {
        title: r.title,
        scheduledFor: r.scheduledFor,
        start: r.startAt && new Date(r.startAt).toString().slice(0, 21),
        end: r.endAt && new Date(r.endAt).toString().slice(0, 21),
      };
    };
    expect(at('Dinner at 7pm with Sam tomorrow')).toEqual({
      title: 'Dinner with Sam',
      scheduledFor: '2026-04-27',
      start: 'Mon Apr 27 2026 19:00',
      end: undefined,
    });
    expect(at('Call 3pm about invoice on friday')).toEqual({
      title: 'Call about invoice',
      scheduledFor: '2026-05-01',
      start: 'Fri May 01 2026 15:00',
      end: undefined,
    });
    expect(at('Gym 6-7pm with Sam tomorrow')).toEqual({
      title: 'Gym with Sam',
      scheduledFor: '2026-04-27',
      start: 'Mon Apr 27 2026 18:00',
      end: 'Mon Apr 27 2026 19:00',
    });
    // A day first, then a time, is still one phrase.
    expect(at('Call friday at 3pm')).toMatchObject({
      title: 'Call',
      start: 'Fri May 01 2026 15:00',
    });
  });

  it('schedules "this month" and "this year" today rather than in the past', () => {
    expect(parseQuickAdd('Send invoice this month', anchor)).toMatchObject({
      title: 'Send invoice',
      scheduledFor: '2026-04-26',
    });
    expect(parseQuickAdd('File taxes this year', anchor).scheduledFor).toBe('2026-04-26');
  });

  it('drops "from", "over the", and "on the" left before a date', () => {
    expect(parseQuickAdd('Pay rent on the 1st of december', anchor)).toMatchObject({
      title: 'Pay rent',
      scheduledFor: '2026-12-01',
    });
    expect(parseQuickAdd('Trip from friday to sunday', anchor)).toMatchObject({
      title: 'Trip',
      scheduledFor: '2026-05-01',
    });
    expect(parseQuickAdd('Email the team from tomorrow', anchor).title).toBe('Email the team');
    expect(parseQuickAdd('Clean garage over the weekend', anchor).title).toBe('Clean garage');
  });

  it('drops a word that only says the time is rough', () => {
    for (const input of [
      'Ship around 5pm',
      'Ship at around 5pm',
      'Ship ~5pm',
      'Ship approx. 5pm',
      'Ship 5pm-ish',
      'Ship 5pm ish',
    ]) {
      const r = parseQuickAdd(input, anchor);
      expect(r.title).toBe('Ship');
      expect(new Date(r.startAt ?? '').getHours()).toBe(17);
    }
    expect(parseQuickAdd('Show Sam around tomorrow', anchor)).toMatchObject({
      title: 'Show Sam around',
      scheduledFor: '2026-04-27',
    });
  });

  it('reads "in two days time" as the offset alone', () => {
    for (const input of [
      'Call in two days time',
      "Call in 2 days' time",
      'Call in 2 days\u2019 time',
    ]) {
      expect(parseQuickAdd(input, anchor)).toMatchObject({
        title: 'Call',
        scheduledFor: '2026-04-28',
      });
    }
    // "time permitting" is its own phrase.
    expect(parseQuickAdd('Call in 2 days time permitting', anchor).title).toBe(
      'Call time permitting',
    );
    expect(parseQuickAdd('Fix tomorrow time zone bug', anchor).title).toBe('Fix time zone bug');
  });

  it('drops "this coming" and "upcoming" before a weekday', () => {
    for (const input of [
      'Call this coming friday',
      'Call coming friday',
      'Call upcoming friday',
      'Call on this coming Friday',
    ]) {
      expect(parseQuickAdd(input, anchor)).toMatchObject({
        title: 'Call',
        scheduledFor: '2026-05-01',
      });
    }
    expect(parseQuickAdd('Plan upcoming launch tomorrow', anchor).title).toBe(
      'Plan upcoming launch',
    );
  });

  it('keeps the comma after a weekday', () => {
    expect(parseQuickAdd('Call mom on Friday, then Bob', anchor)).toMatchObject({
      title: 'Call mom, then Bob',
      scheduledFor: '2026-05-01',
    });
    expect(parseQuickAdd('Call mom tomorrow, then Bob', anchor).title).toBe('Call mom, then Bob');
    expect(parseQuickAdd('Call mom, Friday', anchor).title).toBe('Call mom');
  });

  it('removes square brackets that only held the date', () => {
    expect(parseQuickAdd('[tomorrow] call mom', anchor)).toMatchObject({
      title: 'call mom',
      scheduledFor: '2026-04-27',
    });
    expect(parseQuickAdd('Submit report [due friday]', anchor).title).toBe('Submit report');
    expect(parseQuickAdd('Call mom [about the trip] tomorrow', anchor).title).toBe(
      'Call mom [about the trip]',
    );
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

  it('keeps only the date as the title when nothing else is left', () => {
    expect(parseQuickAdd('tomorrow #work !!', anchor)).toMatchObject({
      title: 'tomorrow',
      scheduledFor: '2026-04-27',
      tags: ['work'],
      priority: 2,
    });
    expect(parseQuickAdd('friday 3pm', anchor)).toMatchObject({
      title: 'friday 3pm',
      scheduledFor: '2026-05-01',
    });
  });

  it('collapses the gap left by a hashtag removed from mid-title', () => {
    const r = parseQuickAdd('Call bob #work please', anchor);

    expect(r.title).toBe('Call bob please');
    expect(r.tags).toEqual(['work']);
  });

  it('leaves a number after # in the title instead of tagging it', () => {
    for (const input of ['Fix issue #123', 'Buy #2 pencils', 'Close #42']) {
      const r = parseQuickAdd(input, anchor);
      expect(r.title).toBe(input);
      expect(r.tags).toEqual([]);
    }
    expect(parseQuickAdd('Plan #Q4 #2026goals', anchor)).toMatchObject({
      title: 'Plan',
      tags: ['q4', '2026goals'],
    });
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
