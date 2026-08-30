import { describe, expect, it } from 'vitest';
import { normalizeStringList } from './string-list';

describe('normalizeStringList', () => {
  it('deduplicates tags across case and equivalent Unicode forms', () => {
    expect(
      normalizeStringList(
        [' Work ', 'work', 'Caf\u00e9', 'Cafe\u0301', '\uff2c\uff33\uff27', 'LSG'],
        'invalid',
        { caseInsensitive: true },
      ),
    ).toEqual(['Work', 'Caf\u00e9', '\uff2c\uff33\uff27']);
  });

  it('keeps case-sensitive values such as media URLs distinct', () => {
    expect(normalizeStringList([' /Media/A.jpg ', '/media/a.jpg'], 'invalid')).toEqual([
      '/Media/A.jpg',
      '/media/a.jpg',
    ]);
  });
});
