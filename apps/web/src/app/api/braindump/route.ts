import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { getAnthropic, MODELS } from '@/lib/server/ai';
import { requestAllowed } from '@/lib/server/guard';

export const runtime = 'nodejs';

const MAX_TEXT = 8000;
const MAX_NAMES = 100;

const BRAINDUMP_SYSTEM = `You are the capture brain for a personal life dashboard. The user speaks or types freely: single thoughts, long rambles, mixed lists. Split the input into distinct items and call route_items exactly once with all of them.

For each item, clean the title (remove filler words and self-corrections) and classify kind:
- task: something to do (default for actions)
- food: something the user ate or drank
- habit: the user says they DID a recurring routine (match routineName from the provided list; only when clearly completed, not planned)
- journal: a reflection about the day or feelings
- note: information to remember
- quote: a quotation worth saving
- event: something happening at a specific time (return as task with dueText)
- person: information about a person (return as note; prefix title with the person's name)

Routing:
- projectName: if the item clearly belongs to one of the provided project names, return that name EXACTLY as given. Otherwise omit.
- routineName: for kind habit, the exact routine name from the list.
- dueText: any natural-language date/time, verbatim (e.g. "tomorrow 2pm").
- priority: 0-3 from urgency cues.
- tags: lowercase topic tags.

For kind food, also return food:
- mealType: breakfast | lunch | dinner | snack (infer from time words or the provided date context; default snack)
- items: each food with name, quantity (e.g. "2 eggs"), and your best ESTIMATE of calories (kcal), protein, carbs, fat in grams. Estimate like a nutritionist; round sensibly. Whole numbers.

Never invent projects or routines that are not in the provided lists.`;

function cleanNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
    .slice(0, MAX_NAMES);
}

export async function POST(req: Request): Promise<Response> {
  if (!requestAllowed(req)) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
  }

  let text = '';
  let projects: string[] = [];
  let routines: string[] = [];
  let date = '';

  try {
    const body = (await req.json()) as {
      text?: unknown;
      context?: { projects?: unknown; routines?: unknown; date?: unknown };
    };
    text = typeof body?.text === 'string' ? body.text.trim() : '';
    projects = cleanNames(body?.context?.projects);
    routines = cleanNames(body?.context?.routines);
    date = typeof body?.context?.date === 'string' ? body.context.date : '';
  } catch {
    /* ignore malformed body */
  }

  if (!text) return NextResponse.json({ ok: false, reason: 'empty' }, { status: 400 });
  if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT);

  const client = getAnthropic();
  if (!client) return NextResponse.json({ ok: false, reason: 'no-key' });

  const contextLines = [
    date ? `Today's date (user-local): ${date}` : '',
    `Active project names: ${projects.length > 0 ? JSON.stringify(projects) : '(none)'}`,
    `Active routine names: ${routines.length > 0 ? JSON.stringify(routines) : '(none)'}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const resp = await client.messages.create({
      model: MODELS.triage,
      max_tokens: 4096,
      system: BRAINDUMP_SYSTEM,
      tool_choice: { type: 'tool', name: 'route_items' },
      tools: [
        {
          name: 'route_items',
          description: 'Split a free-form capture into distinct routed items.',
          input_schema: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    kind: {
                      type: 'string',
                      enum: ['task', 'food', 'habit', 'journal', 'note', 'quote', 'event', 'person'],
                    },
                    title: { type: 'string', description: 'Cleaned, concise title' },
                    notes: { type: 'string', description: 'Any extra detail' },
                    dueText: {
                      type: 'string',
                      description: 'Natural-language date/time, verbatim',
                    },
                    priority: { type: 'integer', enum: [0, 1, 2, 3] },
                    tags: { type: 'array', items: { type: 'string' } },
                    projectName: {
                      type: 'string',
                      description: 'Exact name from the provided project list',
                    },
                    routineName: {
                      type: 'string',
                      description: 'Exact name from the provided routine list (kind habit)',
                    },
                    food: {
                      type: 'object',
                      description: 'Required for kind food: estimated meal breakdown',
                      properties: {
                        mealType: {
                          type: 'string',
                          enum: ['breakfast', 'lunch', 'dinner', 'snack'],
                        },
                        items: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              quantity: { type: 'string', description: 'e.g. "2 eggs"' },
                              calories: { type: 'number', description: 'kcal, estimated' },
                              protein: { type: 'number', description: 'grams' },
                              carbs: { type: 'number', description: 'grams' },
                              fat: { type: 'number', description: 'grams' },
                            },
                            required: ['name', 'calories'],
                          },
                        },
                      },
                      required: ['mealType', 'items'],
                    },
                  },
                  required: ['kind', 'title'],
                },
              },
            },
            required: ['items'],
          },
        },
      ],
      messages: [{ role: 'user', content: `${contextLines}\n\nCapture:\n${text}` }],
    });

    const toolUse = resp.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );
    const items = (toolUse?.input as { items?: unknown } | undefined)?.items;
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: false, reason: 'no-result' });
    }
    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error('[api/braindump] error:', err);
    return NextResponse.json({ ok: false, reason: 'error' });
  }
}
