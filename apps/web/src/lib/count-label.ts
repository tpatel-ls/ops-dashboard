/**
 * A count followed by its noun in the right number: "1 task", "3 tasks".
 *
 * Several labels appended a fixed plural to the count, so a single item read
 * as "1 tasks" or "1 scheduled items", both on screen and to screen readers.
 */
export function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
