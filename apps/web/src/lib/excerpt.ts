const ELLIPSIS = '…';

/**
 * A display excerpt of a longer body, bounded by characters.
 *
 * Slicing a string by UTF-16 units splits a surrogate pair whenever the cut
 * lands inside an astral character (emoji, many CJK extensions, older maths
 * symbols). The surviving half is a lone surrogate, which the DOM renders as
 * the replacement glyph, so a note that happened to be exactly the wrong
 * length ended its preview in a stray box. Count characters instead.
 *
 * The kept text is right-trimmed so the ellipsis follows the last word rather
 * than a space the cut happened to land on.
 */
export function excerpt(body: string, limit: number): string {
  const characters = Array.from(body);
  if (characters.length <= limit) return body;
  return `${characters.slice(0, limit).join('').trimEnd()}${ELLIPSIS}`;
}
