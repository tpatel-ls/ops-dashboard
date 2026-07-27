import { describe, expect, it } from 'vitest';
import { validateJournalImage } from './journal-image';

describe('validateJournalImage', () => {
  it('accepts supported images within the decoded byte limit', () => {
    expect(validateJournalImage('YWJjZA==', 'image/png', 4)).toEqual({
      ok: true,
      data: 'YWJjZA==',
      mediaType: 'image/png',
    });
  });

  it('rejects malformed base64 and unsupported media types', () => {
    expect(validateJournalImage('not base64', 'image/png')).toEqual({
      ok: false,
      reason: 'invalid-image',
    });
    expect(validateJournalImage('YWJjZA==', 'image/svg+xml')).toEqual({
      ok: false,
      reason: 'invalid-image-type',
    });
  });

  it('checks decoded bytes rather than encoded string length', () => {
    expect(validateJournalImage('YWJjZA==', 'image/jpeg', 3)).toEqual({
      ok: false,
      reason: 'image-too-large',
    });
  });
});
