import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

// Date fixtures assert local calendar days, so pin the zone the suite runs in.
// Without this the suite passes on UTC (CI) and in the Americas but fails for
// anyone east of about UTC+11. A zone with an offset also keeps CI exercising
// the local-versus-UTC day logic that a UTC run would hide.
process.env.TZ = 'America/Chicago';

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
