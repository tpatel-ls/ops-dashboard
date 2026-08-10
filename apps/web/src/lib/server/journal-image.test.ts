import { describe, expect, it } from 'vitest';
import { validateJournalImage } from './journal-image';

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
});
