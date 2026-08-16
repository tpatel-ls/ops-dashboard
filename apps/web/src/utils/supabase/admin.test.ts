import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('server-only', () => ({}));

import { createAdminClient, getSingleUserId } from './admin';

afterEach(() => vi.unstubAllEnvs());

describe('getSingleUserId', () => {
  it('uses a normalized explicit user target without listing accounts', async () => {
    const listUsers = vi.fn();
    vi.stubEnv('OPS_USER_ID', '  user-explicit  ');
    const admin = { auth: { admin: { listUsers } } } as unknown as SupabaseClient;

    await expect(getSingleUserId(admin)).resolves.toBe('user-explicit');
    expect(listUsers).not.toHaveBeenCalled();
  });

  it('refuses to guess when an unexpected deployment has multiple users', async () => {
    vi.stubEnv('OPS_USER_ID', '');
    const listUsers = vi.fn().mockResolvedValue({
      data: { users: [{ id: 'user-1' }, { id: 'user-2' }] },
      error: null,
    });
    const admin = { auth: { admin: { listUsers } } } as unknown as SupabaseClient;

    await expect(getSingleUserId(admin)).resolves.toBeNull();
    expect(listUsers).toHaveBeenCalledWith({ page: 1, perPage: 2 });
  });
});

describe('createAdminClient', () => {
  it('treats blank deployment credentials as unconfigured', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '   ');
    vi.stubEnv('SUPABASE_SECRET_KEY', ' secret ');

    expect(createAdminClient()).toBeNull();
  });
});
