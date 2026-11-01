/**
 * Records a picker can link to: everything live and unarchived, plus the one
 * currently linked even if it has since been archived.
 *
 * A controlled `<select>` whose value matches no option shows its first
 * option instead, so leaving out an archived project or domain made a task
 * that still belonged to it read as "No project" or "No domain". Choosing
 * another record then hid the archived one again, which is what archiving is
 * for.
 */
export function linkOptions<T extends { id: string; deletedAt?: string; archivedAt?: string }>(
  rows: readonly T[],
  currentId: string | undefined,
): T[] {
  return rows.filter((row) => !row.deletedAt && (!row.archivedAt || row.id === currentId));
}
