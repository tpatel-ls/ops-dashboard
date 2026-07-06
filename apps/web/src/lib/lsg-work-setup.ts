'use client';

import { LSG_LAUNCH_PROJECT_NAMES, importPortfolioProjects } from './import-projects';

const GUARD_KEY = 'ops:lsg-work-setup-v2';

export async function syncLsgLaunchPlan() {
  return importPortfolioProjects(LSG_LAUNCH_PROJECT_NAMES);
}

export async function ensureLsgWorkSetup(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(GUARD_KEY) === '1') return;
  await syncLsgLaunchPlan();
  localStorage.setItem(GUARD_KEY, '1');
}
