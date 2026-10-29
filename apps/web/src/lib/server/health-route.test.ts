import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authorized: true,
  admin: null as null | { from: ReturnType<typeof vi.fn> },
}));

vi.mock('@/lib/server/health-auth', () => ({ healthRequestAuthorized: () => mocks.authorized }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => mocks.admin }));

import { GET } from '../../app/api/health/route';

/** An admin client whose `from(table).select(...).limit(n)` resolves to `result`. */
function adminReturning(result: { error: { message: string } | null }) {
  const limit = vi.fn().mockResolvedValue({ data: [], ...result });
  const select = vi.fn(() => ({ limit }));
  return { from: vi.fn(() => ({ select })), select, limit };
}

const request = () => new Request('https://dashboard.example/api/health');

afterEach(() => {
  mocks.authorized = true;
  mocks.admin = null;
});

describe('health API', () => {
  it('rejects an unauthorized request before touching the database', async () => {
    mocks.authorized = false;
    const admin = adminReturning({ error: null });
    mocks.admin = admin;

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(admin.from).not.toHaveBeenCalled();
  });

  it('reports healthy in local-first mode when no backend is configured', async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, db: 'unconfigured' });
  });

  it('runs one tiny query so the cron keeps the Supabase project awake', async () => {
    const admin = adminReturning({ error: null });
    mocks.admin = admin;

    const response = await GET(request());

    await expect(response.json()).resolves.toEqual({ ok: true, db: 'up' });
    expect(admin.from).toHaveBeenCalledWith('tasks');
    expect(admin.select).toHaveBeenCalledWith('id');
    expect(admin.limit).toHaveBeenCalledWith(1);
  });

  it('answers 502 when the database query fails', async () => {
    mocks.admin = adminReturning({ error: { message: 'paused' } });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await GET(request());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ ok: false, db: 'error' });
  });
});
