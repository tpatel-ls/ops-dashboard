import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // tsconfig keeps `jsx: preserve` and the `@/` alias for Next's own compiler.
  // Component tests import those files directly, so resolve both here too.
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    exclude: [...configDefaults.exclude, 'e2e/**'],
    maxWorkers: 4,
  },
});
