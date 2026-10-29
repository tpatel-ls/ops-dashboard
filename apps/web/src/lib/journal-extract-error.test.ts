import { describe, expect, it } from 'vitest';
import { journalExtractErrorMessage } from './journal-extract-error';

describe('journalExtractErrorMessage', () => {
  it('names the size limit for an oversized photo', () => {
    expect(journalExtractErrorMessage(413, 'image-too-large')).toContain('5 MB');
  });

  it('treats any 413 as too large, even without our JSON reason', () => {
    expect(journalExtractErrorMessage(413, undefined)).toContain('too large');
  });

  it('lists the accepted formats for an unsupported type', () => {
    expect(journalExtractErrorMessage(400, 'invalid-image-type')).toContain(
      'JPEG, PNG, GIF, or WebP',
    );
  });

  it('says an unreadable file is not an image', () => {
    expect(journalExtractErrorMessage(400, 'invalid-image')).toContain('could not be read');
  });

  it('falls back to the generic message for other failures', () => {
    expect(journalExtractErrorMessage(200, 'error')).toBe(
      'Something went wrong. You can still write your entry below.',
    );
    expect(journalExtractErrorMessage(500, undefined)).toBe(
      'Something went wrong. You can still write your entry below.',
    );
  });
});
