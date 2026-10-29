import type Anthropic from '@anthropic-ai/sdk';

// `/api/capture` and `/api/triage` both classify one capture with this prompt
// and tool. They each held a byte-identical copy, so a prompt or schema fix
// made in one route silently left the other on the old behaviour.
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

/** Request for one forced `route_capture` call; parse the reply with `normalizeTriageResult`. */
export function triageRequest(
  raw: string,
  model: string,
): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model,
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
  };
}
