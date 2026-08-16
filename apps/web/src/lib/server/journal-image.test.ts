import { describe, expect, it } from 'vitest';
import { MAX_JOURNAL_IMAGE_BYTES, validateJournalImage } from './journal-image';

describe('validateJournalImage', () => {
  it('accepts supported images within the decoded byte limit', () => {
    expect(validateJournalImage('iVBORw0KGgo=', 'image/png', 8)).toEqual({
      ok: true,
      data: 'iVBORw0KGgo=',
      mediaType: 'image/png',
    });
  });

  it('rejects malformed base64 and unsupported media types', () => {
    expect(validateJournalImage('not base64', 'image/png')).toEqual({
      ok: false,
      reason: 'invalid-image',
    });
    expect(validateJournalImage('iVBORw0KGgo=', 'image/svg+xml')).toEqual({
      ok: false,
      reason: 'invalid-image-type',
    });
  });

  it('rejects content whose signature does not match its declared type', () => {
    expect(validateJournalImage('R0lGODlh', 'image/png')).toEqual({
      ok: false,
      reason: 'invalid-image',
    });
  });

  it('checks decoded bytes rather than encoded string length', () => {
    expect(validateJournalImage('iVBORw0KGgo=', 'image/png', 7)).toEqual({
      ok: false,
      reason: 'image-too-large',
    });
  });

  it('keeps the default cap when a malformed override is supplied', () => {
    const bytes = Buffer.alloc(MAX_JOURNAL_IMAGE_BYTES + 1);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);

    expect(validateJournalImage(bytes.toString('base64'), 'image/png', Number.NaN)).toEqual({
      ok: false,
      reason: 'image-too-large',
    });
  });
});
