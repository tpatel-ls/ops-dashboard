import { describe, expect, it } from 'vitest';
import { themePreference } from './theme';

describe('themePreference', () => {
  it('uses the operating system preference when no explicit choice is stored', () => {
    expect(themePreference(null)).toBe('system');
    expect(themePreference('invalid')).toBe('system');
  });

  it.each(['light', 'dark', 'system'] as const)('keeps the supported %s preference', (theme) => {
    expect(themePreference(theme)).toBe(theme);
  });
});
