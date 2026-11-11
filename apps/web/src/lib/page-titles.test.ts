import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const APP_ROOT = join(__dirname, '../app/(app)');
const TITLE_RE = /export const metadata = \{ title: '([^']+) · Taskify' \}/;

// Every page is found on disk, so a new route without a title fails here.
// `(app)/page.tsx` only redirects to the default view and keeps the root title.
const pages = readdirSync(APP_ROOT, { recursive: true, encoding: 'utf8' })
  .filter((file) => /(^|[\\/])page\.tsx$/.test(file) && file !== 'page.tsx')
  .sort();

function routeTitle(page: string): string | undefined {
  // A client page cannot export metadata, so its title sits in a layout beside it.
  for (const file of [page, join(dirname(page), 'layout.tsx')]) {
    const path = join(APP_ROOT, file);
    if (!existsSync(path)) continue;
    const match = readFileSync(path, 'utf8').match(TITLE_RE);
    if (match) return match[1];
  }
  return undefined;
}

describe('app page titles', () => {
  it('finds the app pages on disk', () => {
    expect(pages).toContain(join('tasks', 'page.tsx'));
    expect(pages).toContain(join('today', 'page.tsx'));
  });

  // Without these every tab read "Taskify", so open tabs and the history list
  // could not be told apart, and screen readers announced no page name.
  it.each(pages)('%s has its own document title', (page) => {
    expect(routeTitle(page), page).toBeTruthy();
  });
});
