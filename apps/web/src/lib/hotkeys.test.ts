import { describe, expect, it } from 'vitest';
import { matchesHotkey } from './hotkeys';

function keyboardEvent(
  key: string,
  modifiers: Partial<Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>> = {},
): KeyboardEvent {
  return {
    key,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...modifiers,
  } as KeyboardEvent;
}

describe('matchesHotkey', () => {
  it('matches unmodified keys only without extra modifiers', () => {
    expect(matchesHotkey('?', keyboardEvent('?'))).toBe(true);
    expect(matchesHotkey('?', keyboardEvent('?', { ctrlKey: true }))).toBe(false);
  });

  it('supports the platform-neutral mod modifier', () => {
    expect(matchesHotkey('mod+k', keyboardEvent('k', { metaKey: true }))).toBe(true);
    expect(matchesHotkey('mod+k', keyboardEvent('k', { ctrlKey: true }))).toBe(true);
  });

  it('rejects unspecified shift and alt modifiers', () => {
    expect(matchesHotkey('mod+k', keyboardEvent('k', { metaKey: true, shiftKey: true }))).toBe(
      false,
    );
    expect(matchesHotkey('mod+k', keyboardEvent('k', { ctrlKey: true, altKey: true }))).toBe(
      false,
    );
  });
});
