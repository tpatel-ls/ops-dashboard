'use client';

import { getDb } from '@ops-dashboard/core';
import { createDomain } from './domains';
import { createProject } from './projects';
import { addDaysISO, createRoutine, toggleRoutineCheck, todayISO } from './routines';
import { createJournalEntry } from './journal';
import { addTask } from './tasks';
import { logWork } from './worklogs';

/** Seed friendly starter content on a truly empty database (first run / demo). */
export async function ensureSeed(): Promise<void> {
  const db = getDb();
  const [domainCount, taskCount, projectCount] = await Promise.all([
    db.domains.count(),
    db.tasks.count(),
    db.projects.count(),
  ]);
  if (domainCount > 0 || taskCount > 0 || projectCount > 0) return;

  const personal = await createDomain({ name: 'Personal', color: 'oklch(0.7 0.16 150)' });
  const work = await createDomain({ name: 'Work', color: 'oklch(0.72 0.16 60)' });
  const content = await createDomain({ name: 'Content', color: 'oklch(0.65 0.18 280)' });
  const home = await createDomain({ name: 'Home', color: 'oklch(0.7 0.18 30)' });
  const health = await createDomain({ name: 'Health', color: 'oklch(0.62 0.16 200)' });

  const site = await createProject('Client Website Redesign', {
    kind: 'project',
    domainId: work.id,
    description: 'Rebuild the marketing site and ship by month end.',
  });
  await createProject('Home', { kind: 'area', domainId: home.id });
  await createProject('Monthly SEO — Acme', { kind: 'retainer', domainId: work.id });
  await logWork(site.id, 90, 'Wireframes', new Date(Date.now() - 2 * 86400000).toISOString());

  await createRoutine({ name: 'Morning workout', timeOfDay: 'morning', domainId: health.id });
  const vitamins = await createRoutine({ name: 'Take vitamins', timeOfDay: 'morning', domainId: health.id });
  const read = await createRoutine({ name: 'Read 20 minutes', timeOfDay: 'evening', domainId: personal.id });
  await createRoutine({
    name: 'Run 5K every day',
    timeOfDay: 'morning',
    kind: 'fixed',
    durationDays: 30,
    domainId: health.id,
  });

  // Back-fill checks so streaks and the heatmap have history.
  for (let i = 1; i <= 12; i += 1) {
    const d = addDaysISO(todayISO(), -i);
    await toggleRoutineCheck(vitamins.id, d, true);
    if (i % 2 === 0) await toggleRoutineCheck(read.id, d, true);
  }

  await addTask('Change out the water filter in the fridge tomorrow at 2pm', {
    domainId: home.id,
    starred: true,
  });
  await addTask('Outline next YouTube video #content', {
    domainId: content.id,
    projectId: site.id,
    priority: 2,
    starred: true,
  });
  await addTask('Reply to Acme about project scope !!', { domainId: work.id });
  await addTask('Buy new running shoes', { domainId: health.id });
  await addTask('Plan weekend trip', { domainId: personal.id });

  await createJournalEntry({
    body: 'Kicked off the new Ops Dashboard build today. Felt good to finally bring tasks, routines, and journal into one place.',
    source: 'text',
    tags: ['build'],
  });
}
