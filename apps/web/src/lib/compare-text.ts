/** Compare possibly malformed persisted text without throwing during sorting. */
export function compareText(left: unknown, right: unknown): number {
  const leftText = typeof left === 'string' ? left : '';
  const rightText = typeof right === 'string' ? right : '';
  return leftText.localeCompare(rightText);
}
