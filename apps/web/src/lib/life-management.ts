import type {
  Capture,
  Domain,
  FoodLog,
  JournalEntry,
  Project,
  Routine,
  RoutineCheck,
  Task,
} from '@ops-dashboard/core';
import { computeIdentityScore, type IdentityScoreInput } from './identity-score';
import { findStaleDomains } from './briefing';

export type ManagementTone = 'success' | 'warning' | 'danger' | 'primary' | 'muted';

export interface AttentionItem {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: ManagementTone;
}

export interface ManagementModule {
  id: string;
  label: string;
  href: string;
  score: number;
  value: string;
  detail: string;
  tone: ManagementTone;
}

export interface LifeManagementSummary {
  today: string;
  commandScore: number;
  identityScore: number;
  openTasks: number;
  dueToday: number;
  overdue: number;
  activeProjects: number;
  slippingProjects: number;
  pendingCaptures: number;
  routineDone: number;
  routineTotal: number;
  routinePct: number;
  mealsLogged: number;
  journalGapDays: number | null;
  staleDomains: number;
  activeDays: number;
  modules: ManagementModule[];
  attention: AttentionItem[];
}

export interface LifeManagementInput {
  tasks: Task[];
  projects: Project[];
  domains: Domain[];
  routines: Routine[];
  routineChecks: RoutineCheck[];
  captures: Capture[];
  journalEntries: JournalEntry[];
  foodLogs: FoodLog[];
  today?: string;
  now?: Date;
}

const DAY_MS = 86_400_000;

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function datePart(value?: string): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.max(
    0,
    Math.floor((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / DAY_MS),
  );
}

function uniqueActiveDays(input: LifeManagementInput): number {
  const days = new Set<string>();

  for (const task of input.tasks) {
    if (!task.deletedAt && task.completedAt) days.add(datePart(task.completedAt)!);
  }
  for (const check of input.routineChecks) {
    if (!check.deletedAt && check.done) days.add(check.date);
  }
  for (const entry of input.journalEntries) {
    if (!entry.deletedAt) days.add(entry.date);
  }
  for (const log of input.foodLogs) {
    if (!log.deletedAt) days.add(log.date);
  }

  return days.size;
}

function bestRoutineStreak(checks: RoutineCheck[], today: string): number {
  const doneDates = new Set(
    checks.filter((check) => !check.deletedAt && check.done).map((check) => check.date),
  );
  let streak = 0;
  const cursor = new Date(`${today}T00:00:00`);

  while (doneDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function buildModule(
  id: string,
  label: string,
  href: string,
  score: number,
  value: string,
  detail: string,
): ManagementModule {
  const tone: ManagementTone =
    score >= 80 ? 'success' : score >= 55 ? 'primary' : score >= 35 ? 'warning' : 'danger';
  return { id, label, href, score, value, detail, tone };
}

export function summarizeLifeManagement(input: LifeManagementInput): LifeManagementSummary {
  const now = input.now ?? new Date();
  const today = input.today ?? now.toISOString().slice(0, 10);
  const liveTasks = input.tasks.filter((task) => !task.deletedAt && task.status !== 'archived');
  const openTasks = liveTasks.filter((task) => task.status !== 'done');
  const overdue = openTasks.filter(
    (task) =>
      (task.scheduledFor && task.scheduledFor < today) ||
      (task.dueAt && datePart(task.dueAt)! < today),
  );
  const dueToday = openTasks.filter(
    (task) =>
      task.scheduledFor === today ||
      datePart(task.dueAt) === today ||
      datePart(task.startAt) === today,
  );
  const completedThisWeek = liveTasks.filter((task) => {
    const completed = datePart(task.completedAt);
    return completed && daysBetween(completed, today) <= 6;
  }).length;

  const activeProjects = input.projects.filter(
    (project) => !project.deletedAt && !project.archivedAt && project.status === 'active',
  );
  const slippingProjects = activeProjects.filter((project) => {
    if (!project.lastWorkedAt) return true;
    return daysBetween(datePart(project.lastWorkedAt)!, today) > 7;
  });

  const activeRoutines = input.routines.filter((routine) => !routine.deletedAt && !routine.archivedAt);
  const checksToday = new Map(
    input.routineChecks
      .filter((check) => !check.deletedAt && check.date === today)
      .map((check) => [check.routineId, check.done]),
  );
  const routineDone = activeRoutines.filter((routine) => checksToday.get(routine.id) === true).length;
  const routineTotal = activeRoutines.length;
  const routinePct = routineTotal > 0 ? clamp((routineDone / routineTotal) * 100) : 100;

  const mealsLogged = input.foodLogs.filter((log) => !log.deletedAt && log.date === today).length;
  const latestJournal = input.journalEntries
    .filter((entry) => !entry.deletedAt)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const journalGapDays = latestJournal ? daysBetween(latestJournal.date, today) : null;
  const pendingCaptures = input.captures.filter(
    (capture) => !capture.deletedAt && capture.status === 'pending',
  ).length;
  const staleDomains = findStaleDomains({
    domains: input.domains,
    projects: input.projects,
    tasks: input.tasks,
    now,
    staleAfterDays: 7,
  });
  const activeDays = uniqueActiveDays(input);
  const weeklyActiveDays = new Set(
    [
      ...liveTasks
        .map((task) => datePart(task.completedAt))
        .filter((date): date is string => Boolean(date))
        .filter((date) => daysBetween(date, today) <= 6),
      ...input.routineChecks
        .filter((check) => !check.deletedAt && check.done && daysBetween(check.date, today) <= 6)
        .map((check) => check.date),
      ...input.journalEntries
        .filter((entry) => !entry.deletedAt && daysBetween(entry.date, today) <= 6)
        .map((entry) => entry.date),
      ...input.foodLogs
        .filter((log) => !log.deletedAt && daysBetween(log.date, today) <= 6)
        .map((log) => log.date),
    ],
  ).size;

  const identityInput: IdentityScoreInput = {
    bestStreak: bestRoutineStreak(input.routineChecks, today),
    weeklyActiveDays,
    activeDays,
    completedCount: completedThisWeek,
    journalCount: input.journalEntries.filter(
      (entry) => !entry.deletedAt && daysBetween(entry.date, today) <= 6,
    ).length,
    totalPoints: activeDays + completedThisWeek + routineDone + mealsLogged,
  };
  const identityScore = computeIdentityScore(identityInput);

  const modules = [
    buildModule(
      'tasks',
      'Tasks',
      '/tasks',
      clamp(100 - overdue.length * 18 - dueToday.length * 3),
      `${openTasks.length} open`,
      `${dueToday.length} due today · ${overdue.length} overdue`,
    ),
    buildModule(
      'projects',
      'Projects',
      '/projects',
      activeProjects.length > 0
        ? clamp(100 - (slippingProjects.length / activeProjects.length) * 100)
        : 100,
      `${activeProjects.length} active`,
      `${slippingProjects.length} need touch`,
    ),
    buildModule(
      'identity',
      'Identity',
      '/habits',
      identityScore,
      `${identityScore}/100`,
      `${weeklyActiveDays}/7 active days`,
    ),
    buildModule(
      'routines',
      'Routines',
      '/routines',
      routinePct,
      `${routineDone}/${routineTotal}`,
      'completed today',
    ),
    buildModule(
      'nutrition',
      'Food',
      '/food',
      mealsLogged > 0 ? 100 : 25,
      `${mealsLogged}`,
      mealsLogged === 1 ? 'meal logged today' : 'meals logged today',
    ),
    buildModule(
      'journal',
      'Journal',
      '/notepad',
      journalGapDays === null ? 20 : clamp(100 - journalGapDays * 12),
      journalGapDays === null ? 'none' : `${journalGapDays}d`,
      journalGapDays === null ? 'no entry yet' : 'since last entry',
    ),
    buildModule(
      'capture',
      'Capture',
      '/inbox',
      clamp(100 - pendingCaptures * 14),
      `${pendingCaptures}`,
      'pending in inbox',
    ),
    buildModule(
      'domains',
      'Domains',
      '/domains',
      clamp(100 - staleDomains.length * 18),
      `${staleDomains.length}`,
      'life areas stale',
    ),
  ];

  const attention: AttentionItem[] = [
    ...overdue.slice(0, 3).map((task) => ({
      id: `task-${task.id}`,
      title: task.title,
      detail: 'Overdue task',
      href: '/tasks',
      tone: 'danger' as const,
    })),
    ...slippingProjects.slice(0, 3).map((project) => ({
      id: `project-${project.id}`,
      title: project.name,
      detail: project.lastWorkedAt ? 'Project has gone quiet' : 'Project has not been started',
      href: '/projects',
      tone: 'warning' as const,
    })),
    ...staleDomains.slice(0, 3).map((domain) => ({
      id: `domain-${domain.domainId}`,
      title: domain.domainName,
      detail: `${domain.daysIdle} days since signal`,
      href: '/domains',
      tone: 'warning' as const,
    })),
  ];

  if (pendingCaptures > 0) {
    attention.unshift({
      id: 'captures',
      title: 'Route captured items',
      detail: `${pendingCaptures} waiting in Inbox`,
      href: '/inbox',
      tone: 'primary',
    });
  }
  if (mealsLogged === 0) {
    attention.push({
      id: 'food',
      title: 'Log your first meal',
      detail: 'Nutrition is empty today',
      href: '/food',
      tone: 'muted',
    });
  }
  if (routineTotal > 0 && routineDone < routineTotal) {
    attention.push({
      id: 'routines',
      title: 'Finish routines',
      detail: `${routineTotal - routineDone} left today`,
      href: '/routines',
      tone: 'primary',
    });
  }

  const commandScore = clamp(
    modules.reduce((sum, module) => sum + module.score, 0) / modules.length,
  );

  return {
    today,
    commandScore,
    identityScore,
    openTasks: openTasks.length,
    dueToday: dueToday.length,
    overdue: overdue.length,
    activeProjects: activeProjects.length,
    slippingProjects: slippingProjects.length,
    pendingCaptures,
    routineDone,
    routineTotal,
    routinePct,
    mealsLogged,
    journalGapDays,
    staleDomains: staleDomains.length,
    activeDays,
    modules,
    attention: attention.slice(0, 8),
  };
}
