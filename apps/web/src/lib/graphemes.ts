/**
 * The user-perceived characters (grapheme clusters) of `text`.
 *
 * `Array.from` splits by code point, which keeps surrogate pairs whole but
 * still separates the parts of one visible character: a flag's two regional
 * indicators, an emoji joined with U+200D, a skin tone modifier, or a letter
 * and its combining accent. Code that cuts or picks out visible characters
 * should use this instead. Engines without `Intl.Segmenter` fall back to code
 * points.
 */
export function graphemeClusters(text: string): string[] {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') {
    return Array.from(text);
  }
  return Array.from(
    new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
    ({ segment }) => segment,
  );
}
