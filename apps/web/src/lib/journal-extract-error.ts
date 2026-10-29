/**
 * What the journal upload tells the user when `/api/journal/extract` fails.
 *
 * Every failure used to read "Something went wrong", including the ones the
 * server names precisely: a photo over the 5 MB limit (`validateJournalImage`)
 * or one in a format the model cannot read. Those are the failures a user can
 * fix by picking another photo, so say which one it was. A 413 is checked by
 * status as well as reason because a platform body limit can reject the
 * request before the route runs, with a body that is not our JSON.
 */
const GENERIC = 'Something went wrong. You can still write your entry below.';

export function journalExtractErrorMessage(status: number, reason: unknown): string {
  if (status === 413 || reason === 'image-too-large') {
    return 'That photo is too large to read (the limit is 5 MB). Try a smaller photo, or write your entry below.';
  }
  if (reason === 'invalid-image-type') {
    return 'That photo format is not supported. Use a JPEG, PNG, GIF, or WebP image, or write your entry below.';
  }
  if (reason === 'invalid-image') {
    return 'That file could not be read as an image. Try another photo, or write your entry below.';
  }
  return GENERIC;
}
