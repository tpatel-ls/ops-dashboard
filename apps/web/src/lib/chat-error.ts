/**
 * What the Ask page tells the user when `/api/chat` does not answer.
 *
 * Every failed response used to read "Something went wrong. Please try
 * again.", including a 401 from an expired session, which no retry fixes.
 * A response whose body is not the route's JSON (a platform timeout page, for
 * example) was reported as a network error even though the request arrived.
 */
export const CHAT_NO_KEY_MESSAGE = 'No API key configured. Add ANTHROPIC_API_KEY to .env.local.';

export function chatErrorMessage(status: number, reason: unknown): string {
  if (reason === 'no-key') return CHAT_NO_KEY_MESSAGE;
  if (status === 401 || reason === 'unauthorized') {
    return 'Your session has ended. Sign in again, then ask your question.';
  }
  return 'Something went wrong. Please try again.';
}

export const CHAT_NETWORK_ERROR_MESSAGE = 'Network error. Check your connection and try again.';
