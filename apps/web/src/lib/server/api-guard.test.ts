import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/guard', () => ({
  requestAllowed: vi.fn().mockResolvedValue(false),
  bearerSecretMatches: vi.fn().mockReturnValue(false),
}));
vi.mock('@/lib/server/health-auth', () => ({
  healthRequestAuthorized: vi.fn().mockReturnValue(false),
}));
// The admin client is server-only and cannot load under vitest; an unauthorized
// request must be refused before any route reaches it.
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => {
    throw new Error('admin client used before the guard');
  },
}));

const API_ROOT = join(__dirname, '../../app/api');
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

// Every route is found on disk rather than listed here, so a route added
// without a guard fails this test instead of quietly shipping open.
const routeFiles = readdirSync(API_ROOT, { recursive: true, encoding: 'utf8' })
  .filter((file) => /(^|[\\/])route\.ts$/.test(file))
  .sort();

describe('API route guards', () => {
  it('finds the API routes on disk', () => {
    expect(routeFiles).toContain('triage/route.ts');
    expect(routeFiles).toContain('health/route.ts');
  });

  it.each(routeFiles)('%s refuses an unauthorized request with 401', async (file) => {
    const route = (await import(join(API_ROOT, file))) as Record<string, unknown>;
    const handlers = HTTP_METHODS.filter((method) => typeof route[method] === 'function');
    expect(handlers.length).toBeGreaterThan(0);

    for (const method of handlers) {
      const request = new Request(`https://dashboard.example/api/${file}`, {
        method,
        ...(method === 'GET' ? {} : { body: '{}' }),
      });
      const handler = route[method] as (req: Request) => Promise<Response>;
      const response = await handler(request);
      expect(response.status, `${method} ${file}`).toBe(401);
    }
  });
});
