import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { newId, parseQuickAdd, quickAddToTask } from '@ops-dashboard/core';
import type { Capture, CaptureKind, JournalEntry, Task, AppNotification } from '@ops-dashboard/core';
import { getAnthropic, MODELS } from '@/lib/server/ai';
import { requestAllowed } from '@/lib/server/guard';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient, getSingleUserId } from '@/utils/supabase/admin';
import { SYNC_TABLES, toRow } from '@/lib/sync/mapping';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const MAX_RAW = 4000;

const TRIAGE_SYSTEM = `You are the triage engine for a personal life dashboard. The user captures quick thoughts by voice or text, often messy with filler words.

Call route_capture exactly once for each capture.

Rewrite "title" cleanly: remove ums, filler, and self-corrections; keep it concise and actionable. Classify "kind":
- task: something to do (default when it's an action)
- note: information to remember
- journal: a reflection or diary entry about the day
- event: something happening at a specific time
- person: information about someone
- quote: a saved quote or passage

Extract:
- dueText: any natural-language date/time, verbatim (e.g. "tomorrow at 2pm"). Omit if none.
- priority: 0-3 from urgency cues (!, "urgent", "asap" → higher).
- tags: lowercase topic tags.
- domainHint: a short lowercase life area if obvious (home, work, health, content, personal).
- reminderText: if the user asks for a reminder/alert, the offset (e.g. "5 minutes before").`;

interface TriageResult {
  kind: CaptureKind;
  title: string;
  notes?: string;
  dueText?: string;
  priority?: number;
  tags?: string[];
  domainHint?: string;
  reminderText?: string;
}

function bearerMatches(req: Request): boolean {
  const secret = process.env.OPS_API_SECRET;
  if (!secret) return false;
  const provided = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Resolve the persistence target: admin client (watch bearer) or session client (in-app). */
async function resolveTarget(
  req: Request,
): Promise<{ supabase: SupabaseClient; userId: string } | null> {
  if (bearerMatches(req)) {
    const admin = createAdminClient();
    if (!admin) return null;
    const userId = await getSingleUserId(admin);
    return userId ? { supabase: admin, userId } : null;
  }
  const session = await createClient();
  if (!session) return null;
  const { data } = await session.auth.getClaims();
  const userId = data?.claims?.sub;
  return userId ? { supabase: session, userId } : null;
}

function meta(deviceId: string) {
  const now = new Date().toISOString();
  return { id: newId(), createdAt: now, updatedAt: now, version: 1, deviceId };
}

/**
 * Shift parsed time INSTANTS (dueAt/startAt/endAt) from the server-UTC frame into
 * the caller's local time. `scheduledFor` is deliberately left untouched: it is a
 * date-only LOCAL calendar day that the parser already set from the user's
 * wall-clock text. Re-deriving it from the shifted UTC instant would land it on
 * the wrong day whenever the local time straddles UTC midnight.
 */
function applyTzOffset(task: Task, tzOffsetMinutes: number | undefined): Task {
  if (typeof tzOffsetMinutes !== 'number' || !Number.isFinite(tzOffsetMinutes)) return task;
  const shift = (iso?: string) =>
    iso ? new Date(new Date(iso).getTime() + tzOffsetMinutes * 60_000).toISOString() : iso;
  const dueAt = shift(task.dueAt);
  const startAt = shift(task.startAt);
  const endAt = shift(task.endAt);
  return {
    ...task,
    ...(dueAt ? { dueAt } : {}),
    ...(startAt ? { startAt } : {}),
    ...(endAt ? { endAt } : {}),
  };
}

function localDate(tzOffsetMinutes: number | undefined): string {
  const ms =
    typeof tzOffsetMinutes === 'number' && Number.isFinite(tzOffsetMinutes)
      ? Date.now() - tzOffsetMinutes * 60_000
      : Date.now();
  return new Date(ms).toISOString().slice(0, 10);
}

async function triage(raw: string): Promise<TriageResult | null> {
  const client = getAnthropic();
  if (!client) return null;
  try {
    const resp = await client.messages.create({
      model: MODELS.triage,
      max_tokens: 1024,
      system: TRIAGE_SYSTEM,
      tool_choice: { type: 'tool', name: 'route_capture' },
      tools: [
        {
          name: 'route_capture',
          description: 'Classify and clean a captured thought into a structured record.',
          input_schema: {
            type: 'object',
            properties: {
              kind: { type: 'string', enum: ['task', 'note', 'journal', 'event', 'person', 'quote'] },
              title: { type: 'string', description: 'Cleaned, concise title' },
              notes: { type: 'string', description: 'Any extra detail' },
              dueText: { type: 'string', description: 'Natural-language date/time, verbatim' },
              priority: { type: 'integer', enum: [0, 1, 2, 3] },
              tags: { type: 'array', items: { type: 'string' } },
              domainHint: { type: 'string' },
              reminderText: { type: 'string' },
            },
            required: ['kind', 'title'],
          },
        },
      ],
      messages: [{ role: 'user', content: raw }],
    });
    const toolUse = resp.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    return toolUse ? (toolUse.input as TriageResult) : null;
  } catch (err) {
    console.error('[api/capture] triage error:', err);
    return null;
  }
}

export async function POST(req: Request): Promise<Response> {
  if (!requestAllowed(req)) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
  }

  let raw = '';
  let tzOffsetMinutes: number | undefined;
  try {
    const body = (await req.json()) as { raw?: unknown; tzOffsetMinutes?: unknown };
    raw = typeof body?.raw === 'string' ? body.raw.trim() : '';
    if (typeof body?.tzOffsetMinutes === 'number') tzOffsetMinutes = body.tzOffsetMinutes;
  } catch {
    /* malformed body */
  }
  if (!raw) return NextResponse.json({ ok: false, reason: 'empty' }, { status: 400 });
  if (raw.length > MAX_RAW) raw = raw.slice(0, MAX_RAW);

  const result = await triage(raw);

  // Persistence target (so the capture propagates to every device via realtime).
  const target = await resolveTarget(req);
  const watch = bearerMatches(req);
  const deviceId = watch ? 'watch' : 'server';

  // Build the routed record (task or journal). Falls back to a plain task when AI
  // isn't available, matching the in-app capture fallback.
  let routedRecord: Task | JournalEntry;
  let routeType: CaptureKind;
  const aiKind: CaptureKind = result?.kind ?? 'task';

  if (result && aiKind === 'journal') {
    const body = result.notes ? `${result.title}\n${result.notes}` : result.title;
    routedRecord = {
      ...meta(deviceId),
      date: localDate(tzOffsetMinutes),
      body,
      mediaUrls: [],
      tags: result.tags ?? [],
      source: 'upload',
    } satisfies JournalEntry;
    routeType = 'journal';
  } else {
    const titleInput =
      result && result.dueText ? `${result.title} ${result.dueText}` : (result?.title ?? raw);
    const base = quickAddToTask(parseQuickAdd(titleInput), { id: newId(), deviceId, order: 0 });
    routedRecord = applyTzOffset(
      {
        ...base,
        priority: ((result?.priority as Task['priority']) ?? base.priority) || 0,
        tags: result?.tags?.length ? result.tags : base.tags,
        ...(result?.notes ? { notes: result.notes } : {}),
      },
      tzOffsetMinutes,
    );
    routeType = 'task';
  }

  // Without a Supabase target, behave like the old route: triage-and-return only.
  if (!target) {
    return NextResponse.json({ ok: true, result, record: routedRecord, kind: routeType });
  }

  const { supabase, userId } = target;
  const capture: Capture = {
    ...meta(deviceId),
    raw,
    source: watch ? 'watch' : 'text',
    status: 'triaged',
    routedTo: { type: routeType, id: routedRecord.id },
    ...(result?.title ? { aiSummary: result.title } : {}),
    aiKind,
  };
  const notification: AppNotification = {
    ...meta(deviceId),
    title: `Captured: ${result?.title ?? routedRecord.id}`,
    kind: 'capture',
    refType: routeType,
    refId: routedRecord.id,
  };

  try {
    const routedTable = routeType === 'journal' ? SYNC_TABLES.journalEntries : SYNC_TABLES.tasks;
    const [r1, r2, r3] = await Promise.all([
      supabase.from(routedTable).upsert(toRow(routedRecord, userId)),
      supabase.from(SYNC_TABLES.captures).upsert(toRow(capture, userId)),
      supabase.from(SYNC_TABLES.notifications).upsert(toRow(notification, userId)),
    ]);
    if (r1.error) throw r1.error;
    // Capture + notification are best-effort; the routed record is what matters.
    void r2;
    void r3;
  } catch (err) {
    console.error('[api/capture] persist error:', err);
    return NextResponse.json({ ok: false, reason: 'persist-failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, result, record: routedRecord, kind: routeType });
}
