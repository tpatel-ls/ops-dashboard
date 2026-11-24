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
 * Counting code points still cut inside a grapheme cluster: a family or
 * profession emoji joined with U+200D, a flag's regional indicator pair, a
 * skin tone modifier, or a combining accent. The preview then ended in a
 * different emoji or a bare base letter. The cut backs off to the last whole
 * cluster instead. The limit stays a code point count, because callers such
 * as the capture notification size the excerpt to fit a server bound that
 * counts code points.
 *
 * The kept text is right-trimmed so the ellipsis follows the last word rather
 * than a space the cut happened to land on.
 */
export function excerpt(body: string, limit: number): string {
  const characters = Array.from(body);
  if (characters.length <= limit) return body;
  return `${wholeGraphemePrefix(body, limit).trimEnd()}${ELLIPSIS}`;
}

/** The longest run of whole grapheme clusters with at most `limit` code points. */
function wholeGraphemePrefix(body: string, limit: number): string {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') {
    return Array.from(body).slice(0, limit).join('');
  }
  let kept = '';
  let count = 0;
  for (const { segment } of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(
    body,
  )) {
    const length = Array.from(segment).length;
    if (count + length > limit) break;
    kept += segment;
    count += length;
  }
  return kept;
}
