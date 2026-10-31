import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const COMPONENTS = join(__dirname, '../components');

// The overlay writes a combo for people ("Cmd/Ctrl K", "g a", "Esc") while
// useHotkeys takes "mod+k", "g then a", "escape". Reduce both to one form.
function canonical(keys: string): string {
  return keys
    .toLowerCase()
    .replace(/^cmd\/ctrl /, 'mod+')
    .replace(/^esc$/, 'escape')
    .replace(/^(\S) (\S)$/, '$1 then $2');
}

function registeredCombos(file: string): string[] {
  const source = readFileSync(join(COMPONENTS, file), 'utf8');
  return [...source.matchAll(/combo: '([^']+)'/g)].map((match) => match[1]!);
}

function documentedShortcuts(): string[] {
  const source = readFileSync(join(COMPONENTS, 'help-overlay.tsx'), 'utf8');
  // Quick add rows describe text syntax inside the capture field, not hotkeys.
  const hotkeySections = source.slice(0, source.indexOf("heading: 'Quick add'"));
  return [...hotkeySections.matchAll(/\['([^']+)', '[^']+'\]/g)].map((match) =>
    canonical(match[1]!),
  );
}

describe('keyboard shortcut help', () => {
  // The overlay is a hand-written table beside the useHotkeys calls it
  // describes. A renamed or removed binding left the overlay advertising a key
  // that does nothing, and a new binding stayed undiscoverable.
  const registered = [...registeredCombos('app-shell.tsx'), ...registeredCombos('tasks-view.tsx')];

  it('finds the bindings it compares', () => {
    expect(registered).toContain('mod+k');
    expect(registered).toContain('/');
    expect(documentedShortcuts()).toContain('g then h');
  });

  it('documents every global hotkey the app registers', () => {
    const documented = new Set(documentedShortcuts());
    expect(registered.filter((combo) => !documented.has(combo))).toEqual([]);
  });

  it('only documents hotkeys that are registered', () => {
    const bound = new Set(registered);
    expect(documentedShortcuts().filter((keys) => !bound.has(keys))).toEqual([]);
  });
});
