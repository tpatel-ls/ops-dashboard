import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { createNote } from './notes';
import { saveErrorMessage } from './save-error';

const FALLBACK = 'Could not save this note. Your draft is still here.';

describe('saveErrorMessage', () => {
  it('adds the rule a validator reported to the generic message', async () => {
    let error: unknown;
    try {
      await createNote({ title: 'x'.repeat(501), body: 'body', tags: [] });
    } catch (err) {
      error = err;
    }

    expect(saveErrorMessage(FALLBACK, error)).toBe(
      `${FALLBACK} Note title must contain at most 500 characters.`,
    );
  });

  it('keeps only the generic message for database and runtime failures', () => {
    expect(saveErrorMessage(FALLBACK, new Dexie.DatabaseClosedError('closed by test'))).toBe(
      FALLBACK,
    );
    expect(saveErrorMessage(FALLBACK, new TypeError('x is undefined'))).toBe(FALLBACK);
    expect(saveErrorMessage(FALLBACK, new DOMException('quota', 'QuotaExceededError'))).toBe(
      FALLBACK,
    );
  });

  it('keeps only the generic message when nothing useful was thrown', () => {
    expect(saveErrorMessage(FALLBACK, new Error('  '))).toBe(FALLBACK);
    expect(saveErrorMessage(FALLBACK, 'failed')).toBe(FALLBACK);
    expect(saveErrorMessage(FALLBACK, undefined)).toBe(FALLBACK);
  });
});
