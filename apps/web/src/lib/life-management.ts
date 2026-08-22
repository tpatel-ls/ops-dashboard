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
import { isoDay, localDay, todayIso } from '@ops-dashboard/core';
import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';
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

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function datePart(value?: string): string | null {
  return localDay(value) ?? null;
}

function daysBetween(from: string, to: string): number {
  return Math.max(0, differenceInCalendarDays(parseISO(to), parseISO(from)));
}

function isRecentPastDay(date: string, today: string, maximumAge: number): boolean {
  const age = differenceInCalendarDays(parseISO(today), parseISO(date));
  return age >= 0 && age <= maximumAge;
}

function uniqueActiveDays(input: LifeManagementInput, today: string): number {
  const days = new Set<string>();
  const addDay = (value: string | undefined) => {
    const day = localDay(value);
    if (day && day <= today) days.add(day);
  };

  for (const task of input.tasks) {
    if (!task.deletedAt) addDay(task.completedAt);
  }
  for (const check of input.routineChecks) {
    if (!check.deletedAt && check.done) addDay(check.date);
  }
  for (const entry of input.journalEntries) {
    if (!entry.deletedAt) addDay(entry.date);
  }
  for (const log of input.foodLogs) {
    if (!log.deletedAt) addDay(log.date);
  }

  return days.size;
}

function bestRoutineStreak(checks: RoutineCheck[], today: string, routineIds: Set<string>): number {
  const datesByRoutine = new Map<string, Set<string>>();
  for (const check of checks) {
    if (check.deletedAt || !check.done || !routineIds.has(check.routineId)) continue;
    const dates = datesByRoutine.get(check.routineId) ?? new Set<string>();
    dates.add(check.date);
    datesByRoutine.set(check.routineId, dates);
  }

  let best = 0;
  for (const doneDates of datesByRoutine.values()) {
    let streak = 0;
    let cursor = today;
    while (doneDates.has(cursor)) {
      streak += 1;
      cursor = isoDay(addDays(parseISO(cursor), -1));
    }
    best = Math.max(best, streak);
  }
  return best;
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
  const today = input.today ?? todayIso();
  const liveTasks = input.tasks.filter((task) => !task.deletedAt && task.status !== 'archived');
  const openTasks = liveTasks.filter((task) => task.status !== 'done');
  const overdue = openTasks.filter((task) => {
    const scheduledDay = datePart(task.scheduledFor);
    const dueDay = datePart(task.dueAt);
    return Boolean((scheduledDay && scheduledDay < today) || (dueDay && dueDay < today));
  });
  const dueToday = openTasks.filter(
    (task) =>
      task.scheduledFor === today ||
      datePart(task.dueAt) === today ||
      datePart(task.startAt) === today,
  );
  const completedThisWeek = liveTasks.filter((task) => {
    const completed = datePart(task.completedAt);
    return completed && isRecentPastDay(completed, today, 6);
  }).length;

  const activeProjects = input.projects.filter(
    (project) => !project.deletedAt && !project.archivedAt && project.status === 'active',
  );
  const slippingProjects = activeProjects.filter((project) => {
    const lastWorkedDay = datePart(project.lastWorkedAt);
    if (!lastWorkedDay) return true;
    return daysBetween(lastWorkedDay, today) > 7;
  });

  const activeRoutines = input.routines.filter((routine) => {
    const startDay = localDay(routine.startDate);
    const endDay = routine.endDate ? localDay(routine.endDate) : undefined;
    return Boolean(
      !routine.deletedAt &&
      !routine.archivedAt &&
      startDay === routine.startDate &&
      startDay <= today &&
      (!routine.endDate || (endDay === routine.endDate && endDay >= today)),
    );
  });
  const checksToday = new Map(
    input.routineChecks
      .filter((check) => !check.deletedAt && check.date === today)
      .map((check) => [check.routineId, check.done]),
  );
  const routineDone = activeRoutines.filter(
    (routine) => checksToday.get(routine.id) === true,
  ).length;
  const routineTotal = activeRoutines.length;
  const routinePct = routineTotal > 0 ? clamp((routineDone / routineTotal) * 100) : 100;

  const mealsLogged = input.foodLogs.filter((log) => !log.deletedAt && log.date === today).length;
  const latestJournal = input.journalEntries
    .filter((entry) => {
      const date = localDay(entry.date);
      return !entry.deletedAt && Boolean(date && date <= today);
    })
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
  const activeDays = uniqueActiveDays(input, today);
  const weeklyActiveDays = new Set([
    ...liveTasks
      .map((task) => datePart(task.completedAt))
      .filter((date): date is string => Boolean(date))
      .filter((date) => isRecentPastDay(date, today, 6)),
    ...input.routineChecks
      .filter((check) => !check.deletedAt && check.done && isRecentPastDay(check.date, today, 6))
      .map((check) => check.date),
    ...input.journalEntries
      .filter((entry) => !entry.deletedAt && isRecentPastDay(entry.date, today, 6))
      .map((entry) => entry.date),
    ...input.foodLogs
      .filter((log) => !log.deletedAt && isRecentPastDay(log.date, today, 6))
      .map((log) => log.date),
  ]).size;

  const identityInput: IdentityScoreInput = {
    bestStreak: bestRoutineStreak(
      input.routineChecks,
      today,
      new Set(activeRoutines.map((routine) => routine.id)),
    ),
    weeklyActiveDays,
    activeDays,
    completedCount: completedThisWeek,
    journalCount: input.journalEntries.filter(
      (entry) => !entry.deletedAt && isRecentPastDay(entry.date, today, 6),
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
