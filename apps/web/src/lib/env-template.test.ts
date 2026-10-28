import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const WEB_ROOT = join(__dirname, '../..');

// Set by the platform or the test runner, never by the operator.
const PLATFORM_VARIABLES = new Set(['CI', 'NODE_ENV', 'TZ']);

function variablesReadBy(dir: string): Set<string> {
  const names = new Set<string>();
  const files = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter(
    (file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file),
  );
  for (const file of files) {
    for (const match of readFileSync(join(dir, file), 'utf8').matchAll(
      /process\.env\.([A-Z][A-Z0-9_]*)/g,
    )) {
      if (!PLATFORM_VARIABLES.has(match[1]!)) names.add(match[1]!);
    }
  }
  return names;
}

describe('.env.local.example', () => {
  // The deploy runbook tells operators to copy this template and set every
  // variable from it in Vercel, so a variable the code reads but the template
  // omits is one nobody learns to configure.
  it('lists every environment variable the web app reads', () => {
    const template = readFileSync(join(WEB_ROOT, '.env.local.example'), 'utf8');
    const listed = new Set(
      [...template.matchAll(/^#?\s*([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]!),
    );

    const missing = [...variablesReadBy(join(WEB_ROOT, 'src'))].filter((name) => !listed.has(name));
    expect(missing).toEqual([]);
  });
});
