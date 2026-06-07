import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { getAnthropic, MODELS } from '@/lib/server/ai';
import { requestAllowed } from '@/lib/server/guard';

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

export async function POST(req: Request): Promise<Response> {
  if (!requestAllowed(req)) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
  }

  let raw = '';
  try {
    const body = (await req.json()) as { raw?: unknown };
    raw = typeof body?.raw === 'string' ? body.raw.trim() : '';
  } catch {
    /* ignore malformed body */
  }
  if (!raw) return NextResponse.json({ ok: false, reason: 'empty' }, { status: 400 });
  if (raw.length > MAX_RAW) raw = raw.slice(0, MAX_RAW);

  const client = getAnthropic();
  if (!client) return NextResponse.json({ ok: false, reason: 'no-key' });

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
              kind: {
                type: 'string',
                enum: ['task', 'note', 'journal', 'event', 'person', 'quote'],
              },
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

    const toolUse = resp.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );
    if (!toolUse) return NextResponse.json({ ok: false, reason: 'no-result' });
    return NextResponse.json({ ok: true, result: toolUse.input });
  } catch (err) {
    console.error('[api/triage] error:', err);
    return NextResponse.json({ ok: false, reason: 'error' });
  }
}
