import { describe, expect, it } from 'vitest';
import { countLabel } from './count-label';

describe('countLabel', () => {
  it('uses the singular only for exactly one', () => {
    expect(countLabel(1, 'task')).toBe('1 task');
    expect(countLabel(0, 'task')).toBe('0 tasks');
    expect(countLabel(2, 'open task')).toBe('2 open tasks');
  });

  it('takes an irregular plural', () => {
    expect(countLabel(1, 'person', 'people')).toBe('1 person');
    expect(countLabel(4, 'person', 'people')).toBe('4 people');
  });
});
