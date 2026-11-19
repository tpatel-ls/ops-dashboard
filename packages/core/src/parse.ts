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
const DANGLING_PREPOSITION_RE = /(?:^|\s)(?:at|on|by|for|@)\s*$/i;
const BARE_WORD_RE = /^[\p{L}]+\.?$/u;

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
  const { start } = result;
  if (start.isCertain('day') || start.isCertain('weekday') || start.isCertain('hour')) return true;
  return !BARE_WORD_RE.test(result.text.trim());
}

/**
 * Close up the punctuation a removed date or tag leaves behind: "Call mom
 * tomorrow." became "Call mom ." and "Buy milk - tomorrow" became "Buy milk -".
 * Only runs when something was removed, so a title typed as "Agenda:" keeps
 * its colon.
 */
function tidyAfterRemoval(title: string): string {
  return title
    .replace(/\s+([,.;:])/g, '$1')
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
  const results = chrono
    .parse(working, now, { forwardDate: true })
    .filter(
      (result) =>
        isSchedulingMatch(result) &&
        !quoted.some(([open, close]) => result.index > open && result.index < close),
    );
  let scheduledFor: string | undefined;
  let startAt: string | undefined;
  let endAt: string | undefined;
  let dueAt: string | undefined;

  if (results.length > 0) {
    const first = results[0];
    if (first) {
      const start = first.start.date();
      const end = first.end?.date();
      const hasTime = first.start.isCertain('hour');
      scheduledFor = toISODate(start);
      if (hasTime) {
        startAt = start.toISOString();
        if (end) endAt = end.toISOString();
        dueAt = start.toISOString();
      }
      // chrono consumes the preposition for some phrasings ("at 3pm", "on
      // friday") but not others ("at noon", "on Dec 5", "by 12/15", "@
      // 3:30pm"), which left titles like "Call at" or "Ship v1 by". Drop the
      // word that sits directly before the date it introduced.
      removed = true;
      const before = working.slice(0, first.index).replace(DANGLING_PREPOSITION_RE, ' ');
      // Rejoin with a space so marks glued to the date ("tomorrow!!") stand
      // alone and are read as priority below.
      working = `${before} ${working.slice(first.index + first.text.length)}`
        .replace(/\s+/g, ' ')
        .trim();
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
