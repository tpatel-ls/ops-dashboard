/**
 * The message to show when a local save fails.
 *
 * The record validators throw a plain `Error` whose message names the rule
 * the input broke ("Note title must contain at most 500 characters.",
 * "Organization already exists."). Forms used to replace that with a generic
 * "Could not save", so the user saw that the save failed but not why, and
 * could not fix the input. Database and runtime failures are subclasses with
 * their own `name` (Dexie errors, `TypeError`, `DOMException`); their messages
 * are technical, so those keep only the generic text.
 */
export function saveErrorMessage(fallback: string, error: unknown): string {
  if (error instanceof Error && error.name === 'Error' && error.message.trim()) {
    return `${fallback} ${error.message.trim()}`;
  }
  return fallback;
}
