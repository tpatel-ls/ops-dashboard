import type { OrgContext, Project } from '@ops-dashboard/core';
import type { SyncState } from './sync/status';

export type WorkDestination = 'personal' | string;

export function resolveWorkDestination(
  ctx: OrgContext,
  last: WorkDestination | null,
  activeOrgIds: string[],
): WorkDestination {
  if (ctx === 'personal') return 'personal';
  if (ctx !== 'all' && activeOrgIds.includes(ctx)) return ctx;
  if (last === 'personal' || (last && activeOrgIds.includes(last))) return last;
  return 'personal';
}

export function destinationOrgId(destination: WorkDestination): string | undefined {
  return destination === 'personal' ? undefined : destination;
}

export function destinationForProject(project: Pick<Project, 'orgId'>): WorkDestination {
  return project.orgId ?? 'personal';
}

export function projectsForDestination(
  projects: Project[],
  destination: WorkDestination,
): Project[] {
  const orgId = destinationOrgId(destination);
  return projects
    .filter((project) => {
      if (project.deletedAt || project.archivedAt) return false;
      return orgId ? project.orgId === orgId : !project.orgId;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function syncSaveMessage(state: SyncState, pending: number): string {
  if (state === 'live' && pending === 0) return 'Saved and synced';
  if (state === 'live' || state === 'connecting') return 'Saved - syncing now';
  if (state === 'signed-out' || state === 'unconfigured' || state === 'off') {
    return 'Saved on this device - sign in to sync';
  }
  if (state === 'error') return 'Saved on this device - sync needs attention';
  return 'Saved offline - sync queued';
}
