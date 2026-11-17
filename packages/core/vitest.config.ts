import { defineConfig } from 'vitest/config';

// Date fixtures assert local calendar days, so pin the zone the suite runs in.
// Without this the suite passes on UTC (CI) and in the Americas but fails for
// anyone east of about UTC+11. A zone with an offset also keeps CI exercising
// the local-versus-UTC day logic that a UTC run would hide.
process.env.TZ = 'America/Chicago';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts'],
  },
});
