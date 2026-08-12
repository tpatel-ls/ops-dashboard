export type ThemePreference = 'light' | 'dark' | 'system';

export function themePreference(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}
