import type { ID } from './types';

/** The active organization lens: everything, one org, or personal-only. */
export type OrgContext = 'all' | 'personal' | ID;

/** Color for the Personal lane (not an org record, so it needs a constant). */
export const PERSONAL_COLOR = 'oklch(0.62 0.16 200)';

/** Default org seeded for the user; existing LSG projects migrate into it. */
export const DEFAULT_ORG_NAME = 'LS Global Group';
export const DEFAULT_ORG_COLOR = 'oklch(0.6 0.13 265)';

/** Does a record with this orgId belong to the active context? */
export function matchesOrgContext(orgId: string | undefined, ctx: OrgContext): boolean {
  if (ctx === 'all') return true;
  if (ctx === 'personal') return !orgId;
  return orgId === ctx;
}
