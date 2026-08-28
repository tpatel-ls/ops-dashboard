import { describe, expect, it } from 'vitest';
import { supabasePublicConfig } from './config';

describe('supabasePublicConfig', () => {
  it('normalizes the configured URL and publishable key', () => {
    expect(supabasePublicConfig(' https://db.example.test ', ' publishable ')).toEqual({
      url: 'https://db.example.test',
      key: 'publishable',
    });
  });

  it('falls back to a normalized legacy anonymous key', () => {
    expect(supabasePublicConfig('https://db.example.test', '   ', ' anon ')).toEqual({
      url: 'https://db.example.test',
      key: 'anon',
    });
  });

  it('treats blank or incomplete credentials as unconfigured', () => {
    expect(supabasePublicConfig('   ', 'publishable')).toBeNull();
    expect(supabasePublicConfig('https://db.example.test', '   ', '   ')).toBeNull();
  });

  it.each([
    '/relative',
    'not-a-url',
    'javascript:alert(1)',
    'https://user:secret@db.example.test',
  ])('rejects unsafe deployment URL %s', (url) => {
    expect(supabasePublicConfig(url, 'publishable')).toBeNull();
  });
});
