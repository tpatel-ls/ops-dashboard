function paletteText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('en-US');
}

/**
 * Whether a command palette entry should stay listed for `query`.
 *
 * The palette turns off cmdk's own filtering so the fuzzy task search owns
 * the task results, which also left the Actions, Context, and Jump entries
 * unfiltered: their `keywords` were never read, and typing "settings" still
 * listed every destination. An entry matches when each word of the query
 * appears in its label or one of its keywords. A blank query keeps everything.
 */
export function matchesPaletteEntry(query: string, terms: readonly string[]): boolean {
  const words = paletteText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = terms.map(paletteText).join(' ');
  return words.every((word) => haystack.includes(word));
}
