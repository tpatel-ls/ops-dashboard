import { describe, expect, it } from 'vitest';
import { cn } from './cn';

/**
 * `cn` is the class-name entry point for effectively every component in the
 * app, and the behavior components rely on is not clsx's concatenation but
 * tailwind-merge's conflict resolution: a `className` prop passed into a
 * component has to beat the component's own base classes. These cases pin that
 * contract so a tailwind-merge upgrade cannot quietly change it.
 */
describe('cn', () => {
  it('lets a later class win a conflict with an earlier one', () => {
    // The override pattern: base classes first, caller `className` last.
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    expect(cn('text-muted-foreground', 'text-foreground')).toBe('text-foreground');
  });

  it('keeps classes that do not conflict', () => {
    expect(cn('inline-flex items-center', 'gap-2 rounded-md')).toBe(
      'inline-flex items-center gap-2 rounded-md',
    );
  });

  it('resolves conflicts per variant rather than across variants', () => {
    // `hover:` and the bare utility target different states, so both survive.
    expect(cn('bg-card hover:bg-accent', 'bg-primary')).toBe('hover:bg-accent bg-primary');
  });

  it('drops falsy and empty inputs', () => {
    expect(cn('px-2', undefined, null, false, '')).toBe('px-2');
    expect(cn()).toBe('');
  });

  it('accepts the conditional shapes clsx supports', () => {
    expect(cn(['flex', 'gap-1'], { 'opacity-60': true, hidden: false })).toBe(
      'flex gap-1 opacity-60',
    );
  });

  it('flattens nested arrays', () => {
    expect(cn(['flex', ['items-center', ['gap-2']]])).toBe('flex items-center gap-2');
  });
});
