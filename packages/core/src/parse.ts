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

const TAG_RE = /(?:^|\s)#([\p{L}\p{N}_-][\p{L}\p{N}\p{M}_-]*)/gu;
const PRIORITY_RE = /(?:^|\s)(!{1,3})(?=\s|$)/g;
const DANGLING_PREPOSITION_RE =
  /(?:^|\s)(?:at|on|by|for|from|over|during|@|before|until|till|due|no later than)(?:\s+the)?\s*$/i;
const POSSESSIVE_RE = /^['\u2019]s\b/i;
const BARE_WORD_RE = /^[\p{L}]+\.?$/u;
const WORD_WEEKDAY_RE = /^(?:sun|sat|wed)$/i;
const PAST_REFERENCE_RE = /\b(?:yesterday|last|ago|previous|past)\b/i;
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
function isSchedulingMatch(result: chrono.ParsedResult): boolean {
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
  // next Friday. Both also lost the words from the title.
  if (PAST_REFERENCE_RE.test(result.text)) return false;
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

interface DateMatch {
  index: number;
  text: string;
  start: Date;
  end?: Date;
  hasTime: boolean;
}

/**
 * The date phrase to schedule, starting from chrono's first match.
 *
 * chrono reads "tomorrow at 5pm" as one date but "tomorrow @ 5pm" as two: a
 * day, then a time on today. Only the first was used, so "Call mom tomorrow
 * @ 5pm" was scheduled for the day with no time and kept "@ 5pm" in its
 * title. A day followed by "@" and a time is joined into one match.
 */
function dateMatch(
  first: chrono.ParsedResult,
  next: chrono.ParsedResult | undefined,
  text: string,
): DateMatch {
  const match: DateMatch = {
    index: first.index,
    text: first.text,
    start: first.start.date(),
    ...(first.end ? { end: first.end.date() } : {}),
    hasTime: first.start.isCertain('hour'),
  };
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
  const end = next.end ? at(next.end) : undefined;
  return {
    index: first.index,
    text: text.slice(first.index, next.index + next.text.length),
    start,
    ...(end && end > start ? { end } : {}),
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

  const quoted = quotedRanges(working);
  const results = chrono.parse(working, now, { forwardDate: true }).filter(
    (result) =>
      isSchedulingMatch(result) &&
      !quoted.some(([open, close]) => result.index > open && result.index < close) &&
      // A possessive date names the thing, not when to do it: "Prep for
      // tomorrow's demo" saved as "Prep 's demo" and "Review Monday's
      // notes" as "Review 's notes".
      !POSSESSIVE_RE.test(working.slice(result.index + result.text.length)),
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
      // chrono's weekday pattern swallows a closing bracket ("friday)") or a
      // comma ("on Friday, then Bob" lost its comma), so measure the match
      // without brackets at either edge or a trailing comma.
      const leading = /^[([]*/.exec(first.text)?.[0].length ?? 0;
      const trailing = /[)\],]*$/.exec(first.text)?.[0].length ?? 0;
      let before = working.slice(0, first.index + leading);
      let after = working.slice(first.index + first.text.length - trailing);
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
    title: working || input.trim(),
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
