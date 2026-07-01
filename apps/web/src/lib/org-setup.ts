'use client';

import { DEFAULT_ORG_COLOR, DEFAULT_ORG_NAME, getDb } from '@ops-dashboard/core';
import type { Organization, Project, Task } from '@ops-dashboard/core';
import { createOrganization } from './organizations';
import { patchRecord } from './records';

const GUARD_KEY = 'ops:org-setup-v1';

/** Stable id so every device seeds the SAME record (no duplicate orgs). */
export const SEED_ORG_ID = 'org-ls-global-group';

const LSG_PROJECT_NAMES = new Set(['blue text', 'power dialer']);

/**
 * One-time org setup per device: if this device holds LSG projects that have
 * no org yet, ensure the default org exists and move those projects (and
 * their tasks) into it. Idempotent, and a no-op on devices with nothing to
 * migrate (the org then simply arrives via sync). The localStorage guard
 * keeps a later intentional "move project out of the org" from being undone.
 */
export async function ensureOrgSetup(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(GUARD_KEY) === '1') return;

  const db = getDb();
  const projects = (await db.projects.toArray()).filter((p) => !p.deletedAt);
  const toMigrate = projects.filter(
    (p) => !p.orgId && LSG_PROJECT_NAMES.has(p.name.trim().toLowerCase()),
  );
  if (toMigrate.length === 0) {
    localStorage.setItem(GUARD_KEY, '1');
    return;
  }

  const orgs = (await db.organizations.toArray()).filter((o) => !o.deletedAt);
  const existing = orgs.find(
    (o) => o.name.trim().toLowerCase() === DEFAULT_ORG_NAME.toLowerCase(),
  );
  const org: Organization =
    existing ??
    (await createOrganization({
      id: SEED_ORG_ID,
      name: DEFAULT_ORG_NAME,
      color: DEFAULT_ORG_COLOR,
      order: 1,
    }));

  for (const p of toMigrate) {
    await patchRecord<Project>('projects', p.id, { orgId: org.id });
    const tasks = await db.tasks.where('projectId').equals(p.id).toArray();
    for (const t of tasks) {
      if (t.deletedAt || t.orgId) continue;
      await patchRecord<Task>('tasks', t.id, { orgId: org.id });
    }
  }

  localStorage.setItem(GUARD_KEY, '1');
}
