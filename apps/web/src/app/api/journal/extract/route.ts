import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { getAnthropic, MODELS } from '@/lib/server/ai';
import { requestAllowed } from '@/lib/server/guard';

export const runtime = 'nodejs';

const MAX_TEXT = 8000;

const EXTRACT_INSTRUCTION = `You are a journal analysis assistant for a personal life-OS app.

The user has provided a journal entry (text and/or a photo of a handwritten page or daily summary).

Call extract_journal exactly once. Extract:
- summary: a single concise sentence capturing the essence of the entry.
- body: the cleaned, readable journal text (fix OCR artifacts, remove noise, preserve the user's voice).
- mood: one of "great" | "good" | "neutral" | "low" | "rough" — infer from tone.
- tags: up to 6 lowercase topic tags relevant to the content.
- habitsDone: from the provided routineNames list, return only those habits/routines that the entry clearly indicates were completed today. Match case-insensitively. Return exact names as provided.`;

export async function POST(req: Request): Promise<Response> {
  if (!requestAllowed(req)) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
  }

  let text = '';
  let imageBase64: string | undefined;
  let mediaType: string | undefined;
  let routineNames: string[] = [];

  try {
    const body = (await req.json()) as {
      text?: unknown;
      imageBase64?: unknown;
      mediaType?: unknown;
      routineNames?: unknown;
    };
    text = typeof body?.text === 'string' ? body.text.trim() : '';
    imageBase64 = typeof body?.imageBase64 === 'string' ? body.imageBase64 : undefined;
    mediaType = typeof body?.mediaType === 'string' ? body.mediaType : 'image/jpeg';
    routineNames = Array.isArray(body?.routineNames)
      ? (body.routineNames as unknown[]).filter((r): r is string => typeof r === 'string')
      : [];
  } catch {
    /* ignore malformed body */
  }

  if (!text && !imageBase64) {
    return NextResponse.json({ ok: false, reason: 'empty' }, { status: 400 });
  }

  if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT);

  const client = getAnthropic();
  if (!client) return NextResponse.json({ ok: false, reason: 'no-key' });

  const instruction =
    routineNames.length > 0
      ? `${EXTRACT_INSTRUCTION}\n\nActive routine names for habitsDone matching: ${JSON.stringify(routineNames)}\n\n${text || '(see image)'}`
      : `${EXTRACT_INSTRUCTION}\n\n${text || '(see image)'}`;

  const userContent: Anthropic.MessageParam['content'] = imageBase64
    ? [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: (mediaType || 'image/jpeg') as
              | 'image/jpeg'
              | 'image/png'
              | 'image/gif'
              | 'image/webp',
            data: imageBase64,
          },
        },
        { type: 'text', text: instruction },
      ]
    : instruction;

  try {
    const resp = await client.messages.create({
      model: MODELS.vision,
      max_tokens: 1024,
      tool_choice: { type: 'tool', name: 'extract_journal' },
      tools: [
        {
          name: 'extract_journal',
          description: 'Extract structured fields from a journal entry (text or photo).',
          input_schema: {
            type: 'object',
            properties: {
              summary: {
                type: 'string',
                description: 'One concise sentence summarising the entry.',
              },
              body: {
                type: 'string',
                description: 'Cleaned, readable journal text preserving the user\'s voice.',
              },
              mood: {
                type: 'string',
                enum: ['great', 'good', 'neutral', 'low', 'rough'],
                description: 'Inferred mood from the entry.',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Up to 6 lowercase topic tags.',
              },
              habitsDone: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Subset of the provided routineNames that were clearly completed today, matched case-insensitively but returned with original casing.',
              },
            },
            required: ['summary', 'body', 'mood', 'tags', 'habitsDone'],
          },
        },
      ],
      messages: [{ role: 'user', content: userContent }],
    });

    const toolUse = resp.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );
    if (!toolUse) return NextResponse.json({ ok: false, reason: 'no-result' });
    return NextResponse.json({ ok: true, result: toolUse.input });
  } catch (err) {
    console.error('[api/journal/extract] error:', err);
    return NextResponse.json({ ok: false, reason: 'error' });
  }
}
