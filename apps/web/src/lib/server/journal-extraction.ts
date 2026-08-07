import { boundedText, boundedTextList } from './input';

const MOODS = new Set(['great', 'good', 'neutral', 'low', 'rough']);

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
  const tags = Array.from(
    new Set(boundedTextList(input.tags, 6, 64).map((tag) => tag.toLowerCase())),
  );
  const routinesByName = new Map(
    routineNames.map((name) => [name.trim().toLowerCase(), name] as const),
  );
  const habitsDone = Array.from(
    new Set(
      boundedTextList(input.habitsDone, 100, 200)
        .map((name) => routinesByName.get(name.toLowerCase()))
        .filter((name): name is string => Boolean(name)),
    ),
  );
  return { summary, body, mood, tags, habitsDone };
}
