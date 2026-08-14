import { NextResponse } from 'next/server';
import { getAnthropic, MODELS } from '@/lib/server/ai';
import { requestAllowed } from '@/lib/server/guard';
import { boundedText } from '@/lib/server/input';

export const runtime = 'nodejs';

const MAX_CONTEXT = 60_000;
const MAX_QUESTION = 4_000;

const CHAT_SYSTEM = `You are the project intelligence assistant inside Taskify. The user is asking about their organizations, projects, domains, schedules, and open tasks.

Answer using ONLY the information provided in the CONTEXT block below. Be concise and direct. If the context does not contain enough information to answer, say so honestly. Do not invent data. Format your response in plain text - no markdown headers, keep lists minimal.`;

export async function POST(req: Request): Promise<Response> {
  if (!(await requestAllowed(req))) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
  }

  let question = '';
  let context = '';
  try {
    const body = (await req.json()) as { question?: unknown; context?: unknown };
    question = boundedText(body?.question, MAX_QUESTION);
    context = boundedText(body?.context, MAX_CONTEXT);
  } catch {
    /* ignore malformed body */
  }

  if (!question) return NextResponse.json({ ok: false, reason: 'empty' }, { status: 400 });
  const client = getAnthropic();
  if (!client) return NextResponse.json({ ok: false, reason: 'no-key' });

  try {
    const resp = await client.messages.create({
      model: MODELS.chat,
      max_tokens: 1024,
      system: CHAT_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `${question}\n\nCONTEXT:\n${context}`,
        },
      ],
    });

    const textBlock = resp.content.find((b) => b.type === 'text');
    const answer = textBlock && textBlock.type === 'text' ? textBlock.text : '';
    if (!answer) return NextResponse.json({ ok: false, reason: 'no-result' });

    return NextResponse.json({ ok: true, answer });
  } catch (err) {
    console.error('[api/chat] error:', err);
    return NextResponse.json({ ok: false, reason: 'error' });
  }
}
