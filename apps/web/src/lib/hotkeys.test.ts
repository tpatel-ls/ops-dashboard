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

  it('matches a symbol key that the layout produces with shift', () => {
    // US and UK layouts report "?" for Shift+/, so the help shortcut always
    // arrives with shiftKey set.
    expect(matchesHotkey('?', keyboardEvent('?', { shiftKey: true }))).toBe(true);
    expect(matchesHotkey('?', keyboardEvent('?', { shiftKey: true, altKey: true }))).toBe(false);
  });

  it('still requires shift to be absent for letter and named keys', () => {
    expect(matchesHotkey('q', keyboardEvent('q', { shiftKey: true }))).toBe(false);
    expect(matchesHotkey('escape', keyboardEvent('Escape', { shiftKey: true }))).toBe(false);
    expect(matchesHotkey('escape', keyboardEvent('Escape'))).toBe(true);
  });

  it('honors an explicitly requested shift modifier', () => {
    expect(
      matchesHotkey('mod+shift+z', keyboardEvent('z', { metaKey: true, shiftKey: true })),
    ).toBe(true);
    expect(matchesHotkey('mod+shift+z', keyboardEvent('z', { metaKey: true }))).toBe(false);
  });

  it('supports the platform-neutral mod modifier', () => {
    expect(matchesHotkey('mod+k', keyboardEvent('k', { metaKey: true }))).toBe(true);
    expect(matchesHotkey('mod+k', keyboardEvent('k', { ctrlKey: true }))).toBe(true);
    expect(matchesHotkey('mod+k', keyboardEvent('k', { metaKey: true, ctrlKey: true }))).toBe(
      false,
    );
  });

  it('rejects unspecified shift and alt modifiers', () => {
    expect(matchesHotkey('mod+k', keyboardEvent('k', { metaKey: true, shiftKey: true }))).toBe(
      false,
    );
    expect(matchesHotkey('mod+k', keyboardEvent('k', { ctrlKey: true, altKey: true }))).toBe(false);
  });
});
