import { describe, expect, it } from 'vitest';
import { CHAT_NO_KEY_MESSAGE, chatErrorMessage } from './chat-error';

describe('chatErrorMessage', () => {
  it('asks the user to sign in again when the session has ended', () => {
    expect(chatErrorMessage(401, 'unauthorized')).toMatch(/Sign in again/);
  });

  it('treats a 401 without the route JSON as an ended session', () => {
    expect(chatErrorMessage(401, undefined)).toMatch(/Sign in again/);
  });

  it('names the missing API key', () => {
    expect(chatErrorMessage(503, 'no-key')).toBe(CHAT_NO_KEY_MESSAGE);
  });

  it('falls back to a retry message for other failures', () => {
    expect(chatErrorMessage(200, 'error')).toBe('Something went wrong. Please try again.');
    expect(chatErrorMessage(504, undefined)).toBe('Something went wrong. Please try again.');
  });
});
