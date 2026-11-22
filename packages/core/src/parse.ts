import * as chrono from 'chrono-node';
import { toISODate } from './dates';
import type { Priority, Task } from './types';

export interface ParsedQuickAdd {
  title: string;
  scheduledFor?: string;
  startAt?: string;
  endAt?: string;
  dueAt?: string;
  tags: string[];
  priority: Priority;
}

// A tag needs a letter. "#123" and "#2" are numbers: "Fix issue #123" lost
// the issue number from its title to a tag named "123", and "Buy #2 pencils"
// saved as "Buy pencils".
const TAG_RE = /(?:^|\s)#((?=[\p{N}\p{M}_-]*\p{L})[\p{L}\p{N}_-][\p{L}\p{N}\p{M}_-]*)/gu;
// Any standalone run of marks sets priority, capped at urgent below. With
// {1,3} a "!!!!" was not a marker at all: it stayed in the title and left
// the task at no priority, the opposite of what the extra marks asked for.
const PRIORITY_RE = /(?:^|\s)(!+)(?=\s|$)/g;
const DANGLING_PREPOSITION_RE =
  /(?:^|\s)(?:at|on|by|for|from|over|during|between|@|before|until|till|due|no later than)(?:\s+the)?\s*$/i;
// A word that only says a time is rough: "around 5pm", "~3pm", "3pm-ish".
// Only removed next to a time, so "Show Sam around tomorrow" keeps "around".
const APPROXIMATE_BEFORE_RE = /(?:^|\s)(?:around|approx\.?|approximately|circa|~)\s*$/i;
const IN_OFFSET_RE = /^(?:in|within)\s/i;
const TIME_AFTER_OFFSET_RE = /^(?:['\u2019]s?)?\s+time\b(?!\s+permitting)/i;
const COMING_BEFORE_RE = /(?:^|\s)(?:this\s+)?(?:up)?coming\s*$/i;
const WEEKDAY_START_RE = /^[([]*(?:mon|tue|wed|thu|fri|sat|sun|week)/i;
const APPROXIMATE_AFTER_RE = /^\s*-?ish\b/i;
const BETWEEN_TIMES_RE =
  /\b(between\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)(\s+and\s+)(?=\d{1,2}(?::\d{2})?\s*(?:am|pm)\b|\d{1,2}:\d{2}\b)/gi;
const POSSESSIVE_RE = /^['\u2019]s\b/i;
const BARE_WORD_RE = /^[\p{L}]+\.?$/u;
const WORD_WEEKDAY_RE = /^(?:sun|sat|wed)$/i;
// "1/2", "3/4", or "2/3" followed by a unit or "of" is an amount, not a date.
const SLASH_DATE_RE = /^\d{1,2}\/\d{1,2}$/;
const AMOUNT_UNIT_RE =
  /^\s+(?:of|cups?|c|tsp|tbsp|teaspoons?|tablespoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|kilos?|ml|l|liters?|litres?|gal|gallons?|pints?|quarts?|in|inch(?:es)?|ft|foot|feet|yards?|yds?|mi|miles?|km|kilometers?|kilometres?|tablets?|pills?|doses?|slices?|pieces?|scoops?|sticks?|cans?|hours?|hrs?|days?|weeks?)\b/i;
const PAST_REFERENCE_RE = /\b(?:yesterday|last|ago|previous|past|before|earlier)\b/i;
// A length of time with no direction ("5 minutes", "for an hour", "1 hour 30
// min"). "in 20 minutes", "within 2 days", and "2 days later" say when; these
// only say how long.
const DURATION_ONLY_RE =
  /^(?:for\s+)?(?:(?:\d+(?:\.\d+)?|an?|half(?:\s+an?)?|one|two|three|four|five|six|seven|eight|nine|ten|a\s+few|few|several)\s*(?:seconds?|secs?|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|wks?|w|months?|mos?|years?|yrs?|y)\b\s*)+$/i;

/**
 * Whether a chrono match is a date the user meant to schedule.
 *
 * A month name on its own ("Lunch with April", "Plan the May launch") has no
 * day and no weekday, and chrono reads it as the first of that month. That
 * scheduled the task on a date the user never typed and cut the name out of
 * the title. Relative phrases like "next month" and times like "noon" still
 * count.
 */
function isSchedulingMatch(result: FoundDate): boolean {
  // "24/7" means around the clock. chrono falls back to day-first and read
  // "Check 24/7 support" as July 24 next year, saving "Check support".
  if (result.text === '24/7') return false;
  // chrono reads a bare duration as that long from now, so "Read 5 minutes"
  // was due at 09:05 and "Fast 3 days" was scheduled three days out. In "Run
  // for 30 minutes tomorrow" the duration also won over the real date, which
  // stayed in the title.
  if (DURATION_ONLY_RE.test(result.text.trim())) return false;
  // "sun", "sat", and "wed" are also words: "Buy sun cream" was scheduled for
  // Sunday as "Buy cream", and "Get wed invites printed" lost "wed". The
  // full names and "this sat" / "next sun" still schedule.
  if (WORD_WEEKDAY_RE.test(result.text.trim())) return false;
  // A past phrase names what the task is about, not when to do it: "Recap
  // yesterday meeting" was scheduled for yesterday and was overdue the moment
  // it was saved, and forwardDate turned "Follow up on last friday call" into
  // next Friday. Both also lost the words from the title. chrono counts
  // "before" and "earlier" back from now as well: "Call 2 hours before" was
  // set for two hours ago and "Prep 2 days before friday" for today.
  // Read from chrono's copy, where "quarter past 9am" is already "9:15am".
  if (PAST_REFERENCE_RE.test(result.parsedText)) return false;
  const { start } = result;
  if (start.isCertain('day') || start.isCertain('weekday') || start.isCertain('hour')) return true;
  return !BARE_WORD_RE.test(result.text.trim());
}

/**
 * Close up the punctuation a removed date or tag leaves behind: "Call mom
 * tomorrow." became "Call mom .", "Ask Sam tomorrow?" became "Ask Sam ?", and
 * "Buy milk - tomorrow" became "Buy milk -".
 * Only runs when something was removed, so a title typed as "Agenda:" keeps
 * its colon.
 */
function tidyAfterRemoval(title: string): string {
  return title
    .replace(/\s+([,.;:?])/g, '$1')
    .replace(/^(?:[,.;:]|[-\u2013\u2014](?=\s))\s*/, '')
    .replace(/(?:[,;:]|\s[-\u2013\u2014])$/, '')
    .trim();
}

/**
 * Index ranges of quoted spans: straight double quotes and curly quotes.
 *
 * Words in quotes are a name, not a date: '"Today" newsletter draft' and
 * 'Read "Tomorrow and Tomorrow and Tomorrow"' were scheduled and lost the
 * quoted word, leaving titles like '" " newsletter draft'.
 */
function quotedRanges(text: string): Array<[open: number, close: number]> {
  const ranges: Array<[number, number]> = [];
  for (const match of text.matchAll(/"[^"]*"|\u201c[^\u201d]*\u201d/g)) {
    ranges.push([match.index, match.index + match[0].length - 1]);
  }
  return ranges;
}

const WEEKDAY_ABBREVIATION_RE = /\b(tue|wed)s\b\.?/gi;
const CLOCK_PHRASE_RE =
  /\b(?:(quarter)\s+(past|after|to|before|till?)|(half)\s+(past|after))\s+(\d{1,2})\s*(am|pm)?\b/gi;

// "the 15th" with nothing after it but punctuation or a time, so "the 3rd
// floor" and "the 2nd draft" stay in the title.
const ORDINAL_DAY_RE =
  /\bthe\s+(\d{1,2})(?:st|nd|rd|th)\b(?=\s*$|\s*[,.;:!?)\]]|\s+(?:at|@|from|between)\b|\s+\d)/gi;

/** The next date on or after today that falls on this day of the month. */
function nextDayOfMonth(day: number, now: Date): Date | undefined {
  if (day < 1 || day > 31) return undefined;
  for (let ahead = 0; ahead < 12; ahead += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() + ahead, day);
    // A month without the day (the 31st in April) rolls over; skip it.
    if (date.getDate() !== day) continue;
    if (ahead > 0 || day >= now.getDate()) return date;
  }
  return undefined;
}

/**
 * "quarter to 5pm" as a clock time ("4:45pm"), or the phrase unchanged when
 * the hour is not on a clock. Keeps the am/pm the user typed, if any. With
 * no quarterWay it is "half past".
 */
function clockPhrase(
  phrase: string,
  quarterWay: string | undefined,
  hourText: string,
  meridiem: string | undefined,
): string {
  const hour = Number(hourText);
  if (hour < 1 || hour > 12) return phrase;
  const offset =
    quarterWay === undefined ? 30 : /^(?:to|before|till?)$/i.test(quarterWay) ? -15 : 15;
  const pm = meridiem?.toLowerCase() === 'pm';
  const base = ((hour % 12) + (pm ? 12 : 0)) * 60;
  const minutes = (base + offset + 24 * 60) % (24 * 60);
  const minute = String(minutes % 60).padStart(2, '0');
  const hour24 = Math.floor(minutes / 60);
  const hour12 = hour24 % 12 || 12;
  if (meridiem === undefined) return `${hour12}:${minute}`;
  return `${hour12}:${minute}${hour24 >= 12 ? 'pm' : 'am'}`;
}

/** A chrono match measured against the title text rather than chrono's copy. */
interface FoundDate {
  index: number;
  text: string;
  /** The match in chrono's copy, with shortened words as chrono read them. */
  parsedText: string;
  start: chrono.ParsedComponents;
  end?: chrono.ParsedComponents;
}

function widenMatch(
  result: chrono.ParsedResult,
  shortened: ReadonlyArray<[start: number, end: number]>,
  text: string,
): FoundDate {
  let start = result.index;
  let end = result.index + result.text.length;
  for (const [from, to] of shortened) {
    if (from < end && to > start) {
      start = Math.min(start, from);
      end = Math.max(end, to);
    }
  }
  return {
    index: start,
    text: text.slice(start, end),
    parsedText: result.text,
    start: result.start,
    ...(result.end ? { end: result.end } : {}),
  };
}

interface DateMatch {
  index: number;
  text: string;
  start: Date;
  end?: Date;
  hasTime: boolean;
  /** A later day phrase the time was moved onto, removed from the title too. */
  day?: { index: number; text: string };
}

/**
 * The date phrase to schedule, starting from chrono's first match.
 *
 * chrono reads "tomorrow at 5pm" as one date but "tomorrow @ 5pm" as two: a
 * day, then a time on today. Only the first was used, so "Call mom tomorrow
 * @ 5pm" was scheduled for the day with no time and kept "@ 5pm" in its
 * title. A day followed by "@" and a time is joined into one match.
 */
// "for 30 minutes", "for an hour", "for half an hour", "for 1 hour 30 min"
// directly after a start time.
const LENGTH_AFTER_TIME_RE =
  /^\s*,?\s*for\s+(an?|half\s+an?|\d+(?:\.\d+)?(?:\s+and\s+a\s+half)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b(?:\s*(?:and\s+)?(\d+)\s*(?:minutes?|mins?|m)\b|\s+(and\s+a\s+half)\b)?/i;
const MAX_LENGTH_MINUTES = 24 * 60;
// "end of month", "the end of this month", "end of next year".
const END_OF_PERIOD_RE = /\b(?:the\s+)?end\s+of\s+(?:the\s+|(this|next)\s+)?(month|year)\b/gi;
// "end of" left in front of a period chrono did read, like "next week".
const END_OF_BEFORE_RE = /\bend\s+of\s+(?:the\s+)?$/i;
// "an hour and a half", "2 hours and a half", "2 and a half hours".
const HOURS_AND_A_HALF_RE =
  /\b(?:(an?|one|\d+)\s+(hours?|hrs?)\s+and\s+a\s+half|(\d+)\s+and\s+a\s+half\s+(?:hours?|hrs?))\b/gi;

/** Minutes in a LENGTH_AFTER_TIME_RE match, or 0 when it is not a usable length. */
function lengthMinutes(match: RegExpExecArray): number {
  const [, amount = '', unit = '', extra, andAHalf] = match;
  const whole = /^an?$/i.test(amount) ? 1 : /^half/i.test(amount) ? 0.5 : parseFloat(amount);
  const count = whole + (andAHalf || /and\s+a\s+half$/i.test(amount) ? 0.5 : 0);
  const minutes = Math.round(count * (/^h/i.test(unit) ? 60 : 1) + Number(extra ?? 0));
  return minutes > 0 && minutes <= MAX_LENGTH_MINUTES ? minutes : 0;
}

/**
 * The end of a time range, or undefined when it does not follow the start.
 *
 * An end hour typed without am or pm is the next time that hour comes round
 * after the start. chrono read it as the morning hour, so "Call 8am-5" ran to
 * 05:00 the next day as a 21-hour block and "Call 11am-1" ended at 01:00.
 */
function rangeEnd(
  start: Date,
  end: chrono.ParsedComponents,
  date: Date = end.date(),
): Date | undefined {
  const hour = end.get('hour');
  if (!end.isCertain('meridiem') && hour !== null && hour <= 12) {
    date = new Date(start);
    date.setHours(hour, end.get('minute') ?? 0, 0, 0);
    while (date <= start) date.setHours(date.getHours() + 12);
  }
  return date > start ? date : undefined;
}

function dateMatch(first: FoundDate, next: FoundDate | undefined, text: string): DateMatch {
  const firstStart = first.start.date();
  const firstEnd = first.end ? rangeEnd(firstStart, first.end) : undefined;
  const match: DateMatch = {
    index: first.index,
    text: first.text,
    start: firstStart,
    ...(firstEnd ? { end: firstEnd } : {}),
    hasTime: first.start.isCertain('hour'),
  };
  // A time typed before the day it belongs to: chrono reads "Dinner at 7pm
  // with Sam tomorrow" as 19:00 today plus a separate "tomorrow", so the task
  // was scheduled for today and kept "tomorrow" in its title. Move the time
  // onto that day.
  if (
    next &&
    match.hasTime &&
    !first.start.isCertain('day') &&
    !first.start.isCertain('weekday') &&
    !next.start.isCertain('hour') &&
    (next.start.isCertain('day') || next.start.isCertain('weekday'))
  ) {
    const start = next.start.date();
    start.setHours(firstStart.getHours(), firstStart.getMinutes(), 0, 0);
    const end = firstEnd
      ? new Date(start.getTime() + firstEnd.getTime() - firstStart.getTime())
      : undefined;
    return {
      ...match,
      start,
      ...(end ? { end } : {}),
      day: { index: next.index, text: next.text },
    };
  }
  if (
    !next ||
    match.hasTime ||
    !next.start.isCertain('hour') ||
    next.start.isCertain('day') ||
    next.start.isCertain('weekday') ||
    !/^\s*@\s*$/.test(text.slice(first.index + first.text.length, next.index))
  ) {
    return match;
  }
  const at = (time: chrono.ParsedComponents) => {
    const date = new Date(match.start);
    date.setHours(time.get('hour') ?? 0, time.get('minute') ?? 0, 0, 0);
    return date;
  };
  const start = at(next.start);
  const end = next.end ? rangeEnd(start, next.end, at(next.end)) : undefined;
  return {
    index: first.index,
    text: text.slice(first.index, next.index + next.text.length),
    start,
    ...(end ? { end } : {}),
    hasTime: true,
  };
}

export function parseQuickAdd(input: string, now: Date = new Date()): ParsedQuickAdd {
  if (typeof input !== 'string') throw new Error('Quick add text must be a string.');
  let working = input.trim();
  const tags: string[] = [];
  const tagKeys = new Set<string>();

  // Store the same canonical form the tag is deduplicated by. Keeping the raw
  // spelling meant quick-add recorded whichever composition or width the user
  // happened to type, while the capture and brain-dump paths record the NFKC
  // form, so one tag reached the tags index as two visually identical chips
  // that filter to different tasks.
  for (const match of working.matchAll(TAG_RE)) {
    const tag = match[1]?.normalize('NFKC').toLocaleLowerCase('en-US');
    if (tag && !tagKeys.has(tag)) {
      tagKeys.add(tag);
      tags.push(tag);
    }
  }
  let removed = tags.length > 0;
  working = working.replace(TAG_RE, ' ').replace(/\s+/g, ' ').trim();

  // When the date is all the text there is, it becomes the title. Keep it
  // without the tags and priority marks already read from the input:
  // "tomorrow #work !!" saved as "tomorrow #work !!", showing the tag twice.
  const dateOnlyTitle = working.replace(PRIORITY_RE, ' ').replace(/\s+/g, ' ').trim();

  const quoted = quotedRanges(working);
  // Words written shorter in the copy chrono parses, padded with spaces to
  // the same length. A match that covers one is widened to the whole word.
  const shortened: Array<[start: number, end: number]> = [];
  // chrono mishandles "noon" and "midnight" next to another time: it read the
  // "-1" in "noon-1pm" as a UTC offset (07:00, title "Call pm"), started
  // "9am to noon" at noon, and ended "noon - 12:30pm" when it began. Parse a
  // copy with clock times of the same length so match indices still line up
  // with the title text.
  const clockText = working
    .replace(/\bnoon\b/gi, '12pm')
    .replace(/\bmidnight\b/gi, '12:00 am')
    // chrono has no "between 2 and 3pm": it took only "3pm", so the task
    // started at the end of the window and kept "between 2 and" in its
    // title. Write the "and" as a range dash, padded to the same length.
    .replace(BETWEEN_TIMES_RE, (_, from: string, and: string) => from + ' - '.padEnd(and.length))
    // chrono knows "tue" and "thurs" but not "tues" or "weds", so "Lunch
    // tues" was not scheduled at all.
    .replace(WEEKDAY_ABBREVIATION_RE, (word: string, day: string, offset: number) => {
      shortened.push([offset, offset + word.length]);
      return day.padEnd(word.length);
    })
    // chrono reads only the hour in "quarter to 5pm" and "half past 3pm",
    // so the call was set for 17:00 and kept "quarter to" in its title.
    .replace(
      CLOCK_PHRASE_RE,
      (
        phrase: string,
        _quarter: string | undefined,
        quarterWay: string | undefined,
        _half: string | undefined,
        _halfWay: string | undefined,
        hour: string,
        meridiem: string | undefined,
        offset: number,
      ) => {
        const clock = clockPhrase(phrase, quarterWay, hour, meridiem);
        if (clock === phrase) return phrase;
        shortened.push([offset, offset + phrase.length]);
        return clock.padEnd(phrase.length);
      },
    )
    // chrono has no day of the month on its own, so "Pay bills on the 15th"
    // saved unscheduled and "Call on the 3rd at 5pm" was set for 17:00 today
    // with "on the 3rd" left in its title. Write the next such day as a date.
    .replace(ORDINAL_DAY_RE, (phrase: string, day: string, offset: number) => {
      const date = nextDayOfMonth(Number(day), now);
      if (!date) return phrase;
      shortened.push([offset, offset + phrase.length]);
      return `${date.getMonth() + 1}/${date.getDate()}`.padEnd(phrase.length);
    });
  // chrono knows "the day after tomorrow" but read "Lunch day after
  // tomorrow" as tomorrow, saved as "Lunch day after". It also stops at "from
  // today": "Meet 3 days from today" was scheduled today as "Meet 3 days".
  const relativeText = clockText
    // chrono has no "end of": "Pay rent by end of the month" was scheduled a
    // month out as "Pay rent by end of", and "end of month" not at all. The
    // last day of a month or year is a date; write it as one.
    .replace(
      END_OF_PERIOD_RE,
      (phrase: string, which: string | undefined, period: string, offset: number) => {
        const next = /^next/i.test(which ?? '') ? 1 : 0;
        const end = /^month/i.test(period)
          ? new Date(now.getFullYear(), now.getMonth() + next + 1, 0)
          : new Date(now.getFullYear() + next, 11, 31);
        shortened.push([offset, offset + phrase.length]);
        return `${end.getMonth() + 1}/${end.getDate()}/${end.getFullYear()}`.padEnd(phrase.length);
      },
    )
    .replace(/(?<!\bthe\s)\bday after tomorrow\b/gi, (phrase: string, offset: number) => {
      shortened.push([offset, offset + phrase.length]);
      return 'in 2 days'.padEnd(phrase.length);
    })
    // chrono stops at "an hour" in "Call in an hour and a half", so the call
    // was set an hour out and saved as "Call and a half". Write the length
    // as a decimal chrono reads.
    .replace(
      HOURS_AND_A_HALF_RE,
      (
        phrase: string,
        unitFirst: string | undefined,
        _unit: string | undefined,
        andAHalfFirst: string | undefined,
        offset: number,
      ) => {
        const amount = unitFirst ?? andAHalfFirst ?? '';
        const hours = (/^(?:an?|one)$/i.test(amount) ? 1 : Number(amount)) + 0.5;
        shortened.push([offset, offset + phrase.length]);
        return `${hours} hours`.padEnd(phrase.length);
      },
    )
    // chrono reads "w" and "yr" but not "wk", "wks", or "yrs": "Pay bill in
    // 2 wks" saved unscheduled, and "Pay bill 2 wks from now" matched only
    // "now", so it was due this minute.
    .replace(/(?<=(?:\d|\ban?)\s*)(?:wks?|yrs)\b/gi, (unit: string, offset: number) => {
      shortened.push([offset, offset + unit.length]);
      return (/^w/i.test(unit) ? 'w' : 'yr').padEnd(unit.length);
    })
    .replace(
      /(?<=\b(?:days?|weeks?|w|months?|years?|yr)\s+)from today\b/gi,
      (phrase: string, offset: number) => {
        shortened.push([offset, offset + phrase.length]);
        return 'from now'.padEnd(phrase.length);
      },
    );
  const results = chrono
    .parse(relativeText, now, { forwardDate: true })
    .map((result) => widenMatch(result, shortened, working))
    .filter(
      (result) =>
        isSchedulingMatch(result) &&
        // Which day ends a week depends on the week start setting, which the
        // parser does not know. "Ship end of next week" was scheduled at the
        // start of next week as "Ship end of", so leave it to the user.
        !END_OF_BEFORE_RE.test(working.slice(0, result.index)) &&
        !quoted.some(([open, close]) => result.index > open && result.index < close) &&
        // A possessive date names the thing, not when to do it: "Prep for
        // tomorrow's demo" saved as "Prep 's demo" and "Review Monday's
        // notes" as "Review 's notes".
        !POSSESSIVE_RE.test(working.slice(result.index + result.text.length)) &&
        // chrono reads a fraction as a month and day: "Add 1/2 cup sugar" was
        // scheduled for January 2 as "Add cup sugar", and "Fill 2/3 of tank"
        // for February 3 as "Fill of tank".
        !(
          SLASH_DATE_RE.test(result.text) &&
          AMOUNT_UNIT_RE.test(working.slice(result.index + result.text.length))
        ),
    );
  let scheduledFor: string | undefined;
  let startAt: string | undefined;
  let endAt: string | undefined;
  let dueAt: string | undefined;

  if (results.length > 0) {
    if (results[0]) {
      const first = dateMatch(results[0], results[1], working);
      const { start, end, hasTime } = first;
      scheduledFor = toISODate(start);
      // chrono reads "this month" and "this year" as the first day of the
      // period, which forwardDate leaves alone, so "Send invoice this month"
      // was scheduled on the 1st and overdue the moment it was saved. The
      // earliest day of the period still ahead is today.
      const today = toISODate(now);
      if (!hasTime && scheduledFor < today) scheduledFor = today;
      if (hasTime) {
        startAt = start.toISOString();
        if (end) endAt = end.toISOString();
        dueAt = start.toISOString();
      }
      // chrono consumes the preposition for some phrasings ("at 3pm", "on
      // friday") but not others ("at noon", "on Dec 5", "by 12/15", "@
      // 3:30pm"), which left titles like "Call at" or "Ship v1 by". It never
      // consumes a deadline word, so "Finish slides before friday" saved as
      // "Finish slides before". Drop the word that sits directly before the
      // date it introduced.
      removed = true;
      if (first.day) {
        const dayBefore = working.slice(0, first.day.index).replace(DANGLING_PREPOSITION_RE, ' ');
        working = `${dayBefore} ${working.slice(first.day.index + first.day.text.length)}`;
      }
      // chrono's weekday pattern swallows a closing bracket ("friday)") or a
      // comma ("on Friday, then Bob" lost its comma), so measure the match
      // without brackets at either edge or a trailing comma.
      const leading = /^[([]*/.exec(first.text)?.[0].length ?? 0;
      const trailing = /[)\],]*$/.exec(first.text)?.[0].length ?? 0;
      let before = working.slice(0, first.index + leading);
      let after = working.slice(first.index + first.text.length - trailing);
      // A length after the start time is how long the block runs: "Meet 2pm
      // for an hour" kept "for an hour" in its title and had no end time.
      const length = hasTime && !end ? LENGTH_AFTER_TIME_RE.exec(after) : null;
      const minutes = length ? lengthMinutes(length) : 0;
      if (length && minutes > 0) {
        endAt = new Date(start.getTime() + minutes * 60_000).toISOString();
        after = after.slice(length[0].length);
      }
      // A date in its own parentheses ("Submit report (due friday)") or
      // brackets ("[tomorrow] call mom") is an annotation, so the whole
      // group goes with it. Removing only the date left "Submit report (due"
      // and "[ ] call mom".
      for (const [opener, closer] of [
        ['(', ')'],
        ['[', ']'],
      ] as const) {
        const open = before.lastIndexOf(opener);
        if (open > before.lastIndexOf(closer) && after.trimStart().startsWith(closer)) {
          before = before.slice(0, open);
          after = after.trimStart().slice(1);
        }
      }
      if (hasTime) {
        before = before.replace(APPROXIMATE_BEFORE_RE, ' ');
        after = after.replace(APPROXIMATE_AFTER_RE, '');
      }
      // "in two days time" and "in 2 days' time" are the same offset as "in
      // two days", but chrono stops before "time" and saved "Call time".
      if (IN_OFFSET_RE.test(first.text)) after = after.replace(TIME_AFTER_OFFSET_RE, '');
      // chrono reads the weekday in "this coming friday" but not the words
      // before it, which saved "Call this coming".
      if (WEEKDAY_START_RE.test(first.text)) before = before.replace(COMING_BEFORE_RE, ' ');
      before = before.replace(DANGLING_PREPOSITION_RE, ' ');
      // Rejoin with a space so marks glued to the date ("tomorrow!!") stand
      // alone and are read as priority below.
      working = `${before} ${after}`.replace(/\s+/g, ' ').trim();
    }
  }

  // Read priority after the date is gone: "Call bob tomorrow!!" only has a
  // standalone "!!" once "tomorrow" is removed, and reading it first left the
  // marks in the title and the task at no priority.
  let priority: Priority = 0;
  for (const match of working.matchAll(PRIORITY_RE)) {
    priority = Math.max(priority, Math.min(3, match[1]?.length ?? 0)) as Priority;
  }
  working = working.replace(PRIORITY_RE, ' ').replace(/\s+/g, ' ').trim();
  if (removed) working = tidyAfterRemoval(working);

  return {
    title: working || dateOnlyTitle || input.trim(),
    ...(scheduledFor !== undefined ? { scheduledFor } : {}),
    ...(startAt !== undefined ? { startAt } : {}),
    ...(endAt !== undefined ? { endAt } : {}),
    ...(dueAt !== undefined ? { dueAt } : {}),
    tags,
    priority,
  };
}

export function quickAddToTask(
  parsed: ParsedQuickAdd,
  base: { id: string; deviceId: string; order: number },
): Task {
  const nowIso = new Date().toISOString();
  return {
    id: base.id,
    title: parsed.title,
    status: 'todo',
    priority: parsed.priority,
    ...(parsed.scheduledFor !== undefined ? { scheduledFor: parsed.scheduledFor } : {}),
    ...(parsed.startAt !== undefined ? { startAt: parsed.startAt } : {}),
    ...(parsed.endAt !== undefined ? { endAt: parsed.endAt } : {}),
    ...(parsed.dueAt !== undefined ? { dueAt: parsed.dueAt } : {}),
    tags: parsed.tags,
    order: base.order,
    reminders: [],
    checklist: [],
    createdAt: nowIso,
    updatedAt: nowIso,
    version: 1,
    deviceId: base.deviceId,
  };
}
