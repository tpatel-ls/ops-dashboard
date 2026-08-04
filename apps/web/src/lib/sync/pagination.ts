export interface PullRange {
  from: number;
  to: number;
}

export async function visitPullPages<T>(
  fetchPage: (range: PullRange) => Promise<T[] | null>,
  visit: (row: T) => Promise<void>,
  pageSize: number,
): Promise<boolean> {
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new RangeError('Sync page size must be a positive integer.');
  }
  let from = 0;
  while (true) {
    const rows = await fetchPage({ from, to: from + pageSize - 1 });
    if (!rows) return false;
    for (const row of rows) await visit(row);
    if (rows.length < pageSize) return true;
    from += rows.length;
  }
}
