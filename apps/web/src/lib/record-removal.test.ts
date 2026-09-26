import { beforeEach, describe, expect, it, vi } from 'vitest';

const records = vi.hoisted(() => ({
  softDeleteRecord: vi.fn(),
  patchRecord: vi.fn(),
}));

// These modules each own one hand-written one-line delegation to the shared
// record
// helpers. A wrong table name does not throw: softDeleteRecord looks the id up
// in the wrong table, finds nothing, and returns, so the delete button silently
// does nothing. Hold every delegation to its own table in one place instead of
// scattering a near-identical case through a dozen suites.
vi.mock('./records', () => ({
  softDeleteRecord: records.softDeleteRecord,
  patchRecord: records.patchRecord,
  newRecord: vi.fn(),
  putRecord: vi.fn(),
}));

import { deleteBook } from './books';
import { deleteCapture } from './captures';
import { deleteContent } from './content';
import { archiveDomain } from './domains';
import { deleteFoodLog } from './food-logs';
import { deleteJournalEntry } from './journal';
import { deleteNote } from './notes';
import { archiveOrganization } from './organizations';
import { deletePerson } from './people';
import { deleteQuote } from './quotes';
import { archiveRoutine, deleteRoutine } from './routines';

beforeEach(() => {
  records.softDeleteRecord.mockReset().mockResolvedValue(undefined);
  records.patchRecord.mockReset().mockResolvedValue(null);
});

describe('soft-delete delegations', () => {
  it.each([
    ['books', deleteBook],
    ['captures', deleteCapture],
    ['content', deleteContent],
    ['foodLogs', deleteFoodLog],
    ['journalEntries', deleteJournalEntry],
    ['notes', deleteNote],
    ['people', deletePerson],
    ['quotes', deleteQuote],
    ['routines', deleteRoutine],
  ])('tombstones the record in the %s table', async (table, remove) => {
    await remove('record-1');
    expect(records.softDeleteRecord).toHaveBeenCalledTimes(1);
    expect(records.softDeleteRecord).toHaveBeenCalledWith(table, 'record-1');
    expect(records.patchRecord).not.toHaveBeenCalled();
  });
});

describe('archive delegations', () => {
  it.each([
    ['domains', archiveDomain],
    ['organizations', archiveOrganization],
    ['routines', archiveRoutine],
  ])('stamps archivedAt on the record in the %s table', async (table, archive) => {
    await archive('record-1');
    expect(records.patchRecord).toHaveBeenCalledTimes(1);
    const [calledTable, calledId, patch] = records.patchRecord.mock.calls[0]!;
    expect([calledTable, calledId]).toEqual([table, 'record-1']);
    // Archiving is a patch, never a tombstone: the record stays readable.
    expect(Object.keys(patch as object)).toEqual(['archivedAt']);
    expect(Date.parse((patch as { archivedAt: string }).archivedAt)).toBeTypeOf('number');
    expect(Number.isFinite(Date.parse((patch as { archivedAt: string }).archivedAt))).toBe(true);
    expect(records.softDeleteRecord).not.toHaveBeenCalled();
  });
});
