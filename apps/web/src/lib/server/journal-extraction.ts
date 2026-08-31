import { boundedText, boundedTextList } from './input';

const MOODS = new Set(['great', 'good', 'neutral', 'low', 'rough']);

function extractionLabel(value: string): string {
  return value.trim().normalize('NFKC').toLocaleLowerCase('en-US');
}

const EXTRACT_INSTRUCTION = `You are a journal analysis assistant for a personal life-OS app.

The user has provided a journal entry (text and/or a photo of a handwritten page or daily summary).

Call extract_journal exactly once. Extract:
- summary: a single concise sentence capturing the essence of the entry.
- body: the cleaned, readable journal text (fix OCR artifacts, remove noise, preserve the user's voice).
- mood: one of "great" | "good" | "neutral" | "low" | "rough" - infer from tone.
- tags: up to 6 lowercase topic tags relevant to the content.
- habitsDone: from the provided routineNames list, return only those habits/routines that the entry clearly indicates were completed today. Match case-insensitively. Return exact names as provided.`;

export function journalExtractionSystem(routineNames: string[]): string {
  return routineNames.length > 0
    ? `${EXTRACT_INSTRUCTION}\n\nActive routine names for habitsDone matching: ${JSON.stringify(routineNames)}`
    : EXTRACT_INSTRUCTION;
}

export interface JournalExtraction {
  summary: string;
  body: string;
  mood: 'great' | 'good' | 'neutral' | 'low' | 'rough';
  tags: string[];
  habitsDone: string[];
}

export function normalizeJournalExtraction(
  value: unknown,
  routineNames: string[],
): JournalExtraction | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const summary = boundedText(input.summary, 500);
  const body = boundedText(input.body, 8_000);
  if (!summary || !body) return null;
  const requestedMood = boundedText(input.mood, 20).toLowerCase();
  const mood = MOODS.has(requestedMood) ? (requestedMood as JournalExtraction['mood']) : 'neutral';
  const tags = Array.from(new Set(boundedTextList(input.tags, 6, 64).map(extractionLabel)));
  const routinesByName = new Map(
    routineNames.map((name) => [extractionLabel(name), name] as const),
  );
  const habitsDone = Array.from(
    new Set(
      boundedTextList(input.habitsDone, 100, 200)
        .map((name) => routinesByName.get(extractionLabel(name)))
        .filter((name): name is string => Boolean(name)),
    ),
  );
  return { summary, body, mood, tags, habitsDone };
}
