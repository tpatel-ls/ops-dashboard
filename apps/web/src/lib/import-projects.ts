'use client';

import {
  DEFAULT_ORG_COLOR,
  DEFAULT_ORG_NAME,
  getDb,
  isoDay,
  newId,
} from '@ops-dashboard/core';
import type {
  ChecklistItem,
  NamedChecklist,
  Priority,
  Project,
  Task,
  TaskStatus,
} from '@ops-dashboard/core';
import { createDomain } from './domains';
import { createOrganization } from './organizations';
import { SEED_ORG_ID } from './org-setup';
import { createProject } from './projects';
import { patchRecord } from './records';
import { addTask } from './tasks';

// Portfolio seed data
//
// The four projects the user is actively tracking. Loaded on demand or upgraded
// by targeted setup helpers. Writes go through the same local-first helpers as
// normal user actions, so they sync to every signed-in device.

interface SeedTask {
  title: string;
  status: TaskStatus;
  priority: Priority;
  notes?: string;
  tags?: string[];
  scheduleOffset?: number;
  dueOffset?: number;
  startHour?: number;
  durationMinutes?: number;
  estimateMinutes?: number;
}

interface SeedProject {
  name: string;
  color: string;
  domain: string;
  description: string;
  milestones?: Array<{ title: string; dueOffset?: number }>;
  checklists?: Array<{ name: string; items: string[] }>;
  tasks: SeedTask[];
}

const DOMAIN_COLORS: Record<string, string> = {
  LSG: 'oklch(0.6 0.13 265)',
  'Side Projects': 'oklch(0.68 0.14 330)',
};

export const LSG_LAUNCH_PROJECT_NAMES = ['Blue Text', 'Power Dialer'];

export const PORTFOLIO_PROJECTS: SeedProject[] = [
  {
    name: 'Blue Text',
    color: 'oklch(0.62 0.17 255)',
    domain: 'LSG',
    description:
      'LSG blue-texting product. Tighten reliability, local presence, RAG, scripting, sequencing, branded naming, dashboard visuals, scheduling, and inbound AI transfer.',
    milestones: [
      { title: 'Blue messaging rails validated', dueOffset: 7 },
      { title: 'Inbound AI handoff demo ready', dueOffset: 14 },
      { title: 'Calendar sequencing dashboard live', dueOffset: 21 },
    ],
    checklists: [
      {
        name: 'Blue text readiness',
        items: [
          'Document Apple Messages for Business path',
          'Confirm SMS fallback and consent policy',
          'Define branded sender naming',
          'Prove local identity fallback',
          'Demo inbound AI to human transfer',
        ],
      },
    ],
    tasks: [
      {
        title: 'Blue texting capabilities air-tight',
        status: 'doing',
        priority: 3,
        tags: ['blue-text', 'apple', 'reliability'],
        scheduleOffset: 0,
        dueOffset: 3,
        startHour: 10,
        durationMinutes: 90,
        estimateMinutes: 180,
        notes: 'Make the core blue-bubble delivery path rock solid. Use Apple Messages for Business where available, with compliant SMS fallback.',
      },
      {
        title: 'Local identity and area presence with fallback',
        status: 'todo',
        priority: 3,
        tags: ['blue-text', 'presence'],
        scheduleOffset: 1,
        dueOffset: 5,
        estimateMinutes: 150,
        notes:
          'True local presence needs real phone plans, not just numbers. Fallback: when there is no local-plan number for a state, call from a compliant number that matches the contact area code when available.',
      },
      {
        title: 'Branded naming for outbound identity',
        status: 'todo',
        priority: 2,
        tags: ['blue-text', 'brand'],
        scheduleOffset: 2,
        dueOffset: 6,
        estimateMinutes: 90,
        notes: 'Sender, brand language, contact card identity, and account naming must feel owned by the client.',
      },
      {
        title: 'RAG needs to be strong',
        status: 'todo',
        priority: 3,
        tags: ['blue-text', 'rag'],
        scheduleOffset: 3,
        dueOffset: 8,
        estimateMinutes: 180,
        notes: 'Retrieval has to be reliable so replies always pull the right context, offer, objections, and customer history.',
      },
      {
        title: 'Scripting tight',
        status: 'todo',
        priority: 2,
        tags: ['blue-text', 'scripts'],
        scheduleOffset: 4,
        dueOffset: 9,
        estimateMinutes: 120,
        notes: 'Conversation scripts dialed in and consistent for first touch, no-answer, objection, handoff, and close.',
      },
      {
        title: 'Sequencing engine for multi-touch follow-up',
        status: 'todo',
        priority: 2,
        tags: ['blue-text', 'sequence'],
        scheduleOffset: 5,
        dueOffset: 10,
        estimateMinutes: 150,
        notes: 'Multi-step message and follow-up sequencing across SMS, Apple Messages for Business, and callback tasks.',
      },
      {
        title: 'Inbound AI transfer solid',
        status: 'todo',
        priority: 3,
        tags: ['blue-text', 'handoff'],
        scheduleOffset: 6,
        dueOffset: 12,
        startHour: 13,
        durationMinutes: 60,
        estimateMinutes: 180,
        notes: 'Capture inbound intent and move the conversation to a human without losing transcript, lead record, or current script.',
      },
      {
        title: 'Capture can take the call and hand off',
        status: 'todo',
        priority: 3,
        tags: ['blue-text', 'capture', 'handoff'],
        scheduleOffset: 7,
        dueOffset: 13,
        estimateMinutes: 150,
        notes: 'A captured inbound call should have context, ownership, and a clean transfer path to a rep or AI voice agent.',
      },
      {
        title: 'Better dashboard visuals',
        status: 'backlog',
        priority: 2,
        tags: ['blue-text', 'dashboard'],
        scheduleOffset: 8,
        dueOffset: 14,
        estimateMinutes: 120,
        notes: 'Improve the visuals on the dashboard so the LSG launch pipeline reads like a live command surface.',
      },
      {
        title: 'Scheduling with a calendar view',
        status: 'backlog',
        priority: 2,
        tags: ['blue-text', 'calendar'],
        scheduleOffset: 9,
        dueOffset: 15,
        estimateMinutes: 120,
        notes: 'Improve the scheduling component. Add a calendar view that shows all future touches, calls, callbacks, and launches.',
      },
      {
        title: 'Dialing interface with RingCentral and NICE',
        status: 'backlog',
        priority: 3,
        tags: ['blue-text', 'ringcentral', 'nice'],
        scheduleOffset: 10,
        dueOffset: 16,
        estimateMinutes: 180,
        notes: 'Connect the Blue Text workflow to the same phone-system interface needed by the Power Dialer.',
      },
      {
        title: 'Apple integration path for blue messaging',
        status: 'backlog',
        priority: 2,
        tags: ['blue-text', 'apple'],
        scheduleOffset: 11,
        dueOffset: 18,
        estimateMinutes: 180,
        notes: 'Use Apple Messages for Business or an approved messaging service provider path. Avoid private iMessage automation.',
      },
    ],
  },
  {
    name: 'Power Dialer',
    color: 'oklch(0.7 0.15 165)',
    domain: 'LSG',
    description:
      'LSG power dialer build. Plug into RingCentral or NICE, rank leads, parallel dial, assist reps, follow up automatically, write back to CRM, and expose live manager controls.',
    milestones: [
      { title: 'Vendor feasibility locked', dueOffset: 5 },
      { title: 'Lead ordering and campaign simulator ready', dueOffset: 12 },
      { title: 'Rep assist and handoff demo ready', dueOffset: 19 },
      { title: 'Manager dashboard pilot ready', dueOffset: 28 },
    ],
    checklists: [
      {
        name: 'Power dialer launch gates',
        items: [
          'RingCentral OAuth and scopes confirmed',
          'NICE CXone tenant/API path confirmed',
          'CRM import and write-back schema mapped',
          'Consent, opt-out, recording, and DNC rules documented',
          'No-answer sequence approved',
          'Overflow agent handoff defined',
        ],
      },
    ],
    tasks: [
      {
        title: 'Research feasibility and APIs for RingCentral, NICE, and Apple messaging',
        status: 'doing',
        priority: 3,
        tags: ['power-dialer', 'research', 'ringcentral', 'nice', 'apple'],
        scheduleOffset: 0,
        dueOffset: 2,
        startHour: 14,
        durationMinutes: 90,
        estimateMinutes: 180,
        notes:
          'RingCentral exposes voice, call control, call logs, recordings, SMS, and analytics APIs. NICE CXone exposes auth, agent, admin, reporting, realtime, and digital engagement APIs. Apple blue messaging needs Apple Messages for Business or an approved MSP path.',
      },
      {
        title: 'Plug into existing phone system (RingCentral or NICE)',
        status: 'todo',
        priority: 3,
        tags: ['power-dialer', 'ringcentral', 'nice'],
        scheduleOffset: 1,
        dueOffset: 4,
        estimateMinutes: 240,
        notes:
          'Nothing gets replaced. Use their existing numbers and lines. Going live is a quick connection, not a migration.',
      },
      {
        title: 'Pull lead list and build smart call ordering',
        status: 'todo',
        priority: 3,
        tags: ['power-dialer', 'leads', 'scoring'],
        scheduleOffset: 2,
        dueOffset: 6,
        estimateMinutes: 240,
        notes:
          'Pull the lead list from CRM or upload. Put the people most likely to answer and buy at the top, then schedule by likely answer time.',
      },
      {
        title: 'Consent, DNC, recording, and opt-out compliance spec',
        status: 'todo',
        priority: 3,
        tags: ['power-dialer', 'compliance'],
        scheduleOffset: 3,
        dueOffset: 7,
        estimateMinutes: 180,
        notes:
          'Lock consent source, TCPA posture, state recording rules, opt-out handling, suppression lists, and audit logs before any live dialing.',
      },
      {
        title: 'Predictive and parallel dialing',
        status: 'backlog',
        priority: 3,
        tags: ['power-dialer', 'dialing'],
        scheduleOffset: 4,
        dueOffset: 9,
        startHour: 11,
        durationMinutes: 120,
        estimateMinutes: 300,
        notes:
          'Call several numbers at once. Only put a rep on the line when a real person says hello. Filter voicemails, busy signals, and dead numbers.',
      },
      {
        title: 'In-call rep assist',
        status: 'backlog',
        priority: 2,
        tags: ['power-dialer', 'rep-assist', 'scripts'],
        scheduleOffset: 6,
        dueOffset: 12,
        estimateMinutes: 240,
        notes:
          'Instantly show who the rep is talking to, their history, the right script, objections, notes, and recording/transcription status.',
      },
      {
        title: 'Auto follow-up to no-answers with text, Apple messaging, and callback tasks',
        status: 'backlog',
        priority: 2,
        tags: ['power-dialer', 'follow-up', 'blue-text'],
        scheduleOffset: 8,
        dueOffset: 14,
        estimateMinutes: 210,
        notes:
          'Reach every no-answer with a compliant SMS path, Apple Messages for Business where available, or a callback task. Several touches without a rep lifting a finger.',
      },
      {
        title: 'Auto CRM write-back',
        status: 'backlog',
        priority: 2,
        tags: ['power-dialer', 'crm'],
        scheduleOffset: 10,
        dueOffset: 17,
        estimateMinutes: 240,
        notes: 'Every call result, recording, transcript, and note lands in the CRM automatically. Zero manual data entry.',
      },
      {
        title: 'Manager live dashboard',
        status: 'backlog',
        priority: 2,
        tags: ['power-dialer', 'dashboard'],
        scheduleOffset: 12,
        dueOffset: 21,
        estimateMinutes: 240,
        notes:
          'Live view: people reached, total talk time, conversions, rep performance, script performance, stuck leads, and callback backlog.',
      },
      {
        title: 'Overflow and AI voice agents (revenue stream)',
        status: 'backlog',
        priority: 1,
        tags: ['power-dialer', 'ai-voice', 'handoff'],
        scheduleOffset: 14,
        dueOffset: 24,
        estimateMinutes: 240,
        notes:
          'When the team is maxed out or after hours, LSG agents or AI voice agents catch the overflow. This becomes a second revenue stream.',
      },
      {
        title: 'Inbound AI transfer and human takeover flow',
        status: 'backlog',
        priority: 2,
        tags: ['power-dialer', 'handoff', 'ai-voice'],
        scheduleOffset: 16,
        dueOffset: 26,
        estimateMinutes: 210,
        notes:
          'Capture the call, keep transcript/context visible, and let a human or AI voice agent take over without losing the lead.',
      },
    ],
  },
  {
    name: 'Mini Monet',
    color: 'oklch(0.64 0.19 300)',
    domain: 'Side Projects',
    description: 'Kids story generation app.',
    tasks: [
      {
        title: 'Define scope: age range, story length, output format',
        status: 'todo',
        priority: 3,
        notes: 'Mini Monet is a kids story generation app. Nail the core experience first.',
      },
      {
        title: 'Choose story-gen model and safety guardrails',
        status: 'backlog',
        priority: 2,
        notes: 'Pick the model and the kid-safe content guardrails.',
      },
      {
        title: 'Sketch the kid-friendly UI',
        status: 'backlog',
        priority: 2,
        notes: 'Simple, playful, age-appropriate interface.',
      },
    ],
  },
  {
    name: 'Email Triage',
    color: 'oklch(0.75 0.15 70)',
    domain: 'Side Projects',
    description: 'Email triage app to finish.',
    tasks: [
      {
        title: 'Finish the email triage app',
        status: 'doing',
        priority: 3,
        notes: 'Complete the email triage app. Break the remaining work into subtasks.',
      },
      {
        title: 'Define remaining scope to ship',
        status: 'todo',
        priority: 2,
        notes: 'List what is left before it can ship.',
      },
    ],
  },
];

/** Names used by the dashboard to decide whether the "Load my projects" CTA is needed. */
export const PORTFOLIO_PROJECT_NAMES = PORTFOLIO_PROJECTS.map((p) => p.name);

export interface ImportResult {
  projectsCreated: number;
  tasksCreated: number;
  projectsUpdated: number;
  tasksUpdated: number;
  skipped: string[];
}

function dateAtOffset(offset: number, hour = 9, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function dueAtOffset(offset: number): string {
  return dateAtOffset(offset, 17, 0).toISOString();
}

function taskSchedulePatch(def: SeedTask): Partial<Task> {
  const patch: Partial<Task> = {};
  if (def.scheduleOffset !== undefined) {
    patch.scheduledFor = isoDay(dateAtOffset(def.scheduleOffset));
  }
  if (def.startHour !== undefined) {
    const start = dateAtOffset(def.scheduleOffset ?? def.dueOffset ?? 0, def.startHour);
    const end = new Date(start.getTime() + (def.durationMinutes ?? 60) * 60000);
    patch.startAt = start.toISOString();
    patch.endAt = end.toISOString();
    patch.dueAt = start.toISOString();
  } else if (def.dueOffset !== undefined) {
    patch.dueAt = dueAtOffset(def.dueOffset);
  }
  if (def.estimateMinutes !== undefined) patch.estimateMinutes = def.estimateMinutes;
  return patch;
}

function recordKey(value: string): string {
  return value.trim().toLowerCase();
}

function mergeTags(current: string[], next: string[] | undefined): string[] {
  if (!next?.length) return current;
  return Array.from(new Set([...current, ...next.map((tag) => tag.toLowerCase())]));
}

function checklistFromSeed(seed: { name: string; items: string[] }): NamedChecklist {
  return {
    id: newId(),
    name: seed.name,
    items: seed.items.map(
      (text): ChecklistItem => ({
        id: newId(),
        text,
        done: false,
      }),
    ),
  };
}

function mergeProjectStructure(project: Project, def: SeedProject): Partial<Project> {
  const patch: Partial<Project> = {};
  if (!project.description && def.description) patch.description = def.description;

  if (def.milestones?.length) {
    const current = project.milestones ?? [];
    const seen = new Set(current.map((m) => recordKey(m.title)));
    const missing = def.milestones
      .filter((m) => !seen.has(recordKey(m.title)))
      .map((m) => ({
        id: newId(),
        title: m.title,
        done: false,
        ...(m.dueOffset !== undefined ? { dueAt: dueAtOffset(m.dueOffset) } : {}),
      }));
    if (missing.length) patch.milestones = [...current, ...missing];
  }

  if (def.checklists?.length) {
    const current = project.checklists ?? [];
    const seen = new Set(current.map((c) => recordKey(c.name)));
    const missing = def.checklists
      .filter((c) => !seen.has(recordKey(c.name)))
      .map(checklistFromSeed);
    if (missing.length) patch.checklists = [...current, ...missing];
  }

  return patch;
}

/**
 * Create or upgrade portfolio projects. Existing projects are not skipped
 * wholesale: missing tasks, schedule metadata, org lane, milestones, and
 * checklists are added without overwriting user completion state.
 */
export async function importPortfolioProjects(names = PORTFOLIO_PROJECT_NAMES): Promise<ImportResult> {
  const db = getDb();
  const wantedNames = new Set(names.map(recordKey));

  const existingProjects = (await db.projects.toArray()).filter((p) => !p.deletedAt);
  const projectByName = new Map(existingProjects.map((p) => [recordKey(p.name), p]));

  const existingDomains = (await db.domains.toArray()).filter((d) => !d.deletedAt);
  const domainIdByName = new Map(existingDomains.map((d) => [recordKey(d.name), d.id]));

  async function ensureDomain(name: string): Promise<string> {
    const key = recordKey(name);
    const found = domainIdByName.get(key);
    if (found) return found;
    const created = await createDomain({
      name,
      color: DOMAIN_COLORS[name] ?? 'oklch(0.65 0.1 280)',
    });
    domainIdByName.set(key, created.id);
    return created.id;
  }

  const result: ImportResult = {
    projectsCreated: 0,
    tasksCreated: 0,
    projectsUpdated: 0,
    tasksUpdated: 0,
    skipped: [],
  };

  const orgs = (await db.organizations.toArray()).filter((o) => !o.deletedAt);
  const seedOrg =
    orgs.find((o) => recordKey(o.name) === recordKey(DEFAULT_ORG_NAME)) ??
    (await createOrganization({
      id: SEED_ORG_ID,
      name: DEFAULT_ORG_NAME,
      color: DEFAULT_ORG_COLOR,
      order: 1,
    }));

  for (const def of PORTFOLIO_PROJECTS) {
    if (!wantedNames.has(recordKey(def.name))) continue;

    const domainId = await ensureDomain(def.domain);
    const orgId = def.domain === 'LSG' ? seedOrg.id : undefined;
    let project = projectByName.get(recordKey(def.name));

    if (!project) {
      project = await createProject(def.name, {
        color: def.color,
        kind: 'project',
        domainId,
        ...(orgId ? { orgId } : {}),
        description: def.description,
      });
      projectByName.set(recordKey(def.name), project);
      result.projectsCreated += 1;
    }

    const projectPatch: Partial<Project> = {
      ...mergeProjectStructure(project, def),
    };
    if (!project.domainId) projectPatch.domainId = domainId;
    if (orgId && !project.orgId) projectPatch.orgId = orgId;

    if (Object.keys(projectPatch).length > 0) {
      const patched = await patchRecord<Project>('projects', project.id, projectPatch);
      if (patched) project = patched;
      result.projectsUpdated += 1;
    }

    const existingTasks = (await db.tasks.where('projectId').equals(project.id).toArray()).filter(
      (t) => !t.deletedAt,
    );
    const taskByTitle = new Map(existingTasks.map((t) => [recordKey(t.title), t]));

    for (const taskDef of def.tasks) {
      const schedulePatch = taskSchedulePatch(taskDef);
      const existing = taskByTitle.get(recordKey(taskDef.title));
      const base: Partial<Task> = {
        projectId: project.id,
        domainId,
        ...(project.orgId ? { orgId: project.orgId } : {}),
        tags: taskDef.tags ?? [],
        ...(taskDef.notes ? { notes: taskDef.notes } : {}),
        ...schedulePatch,
      };

      if (!existing) {
        const created = await addTask(taskDef.title, {
          ...base,
          status: taskDef.status,
          priority: taskDef.priority,
        });
        taskByTitle.set(recordKey(created.title), created);
        result.tasksCreated += 1;
        continue;
      }

      const patch: Partial<Task> = {};
      if (!existing.projectId) patch.projectId = project.id;
      if (!existing.domainId) patch.domainId = domainId;
      if (project.orgId && !existing.orgId) patch.orgId = project.orgId;
      if (taskDef.notes && !existing.notes) patch.notes = taskDef.notes;

      const tags = mergeTags(existing.tags, taskDef.tags);
      if (tags.length !== existing.tags.length) patch.tags = tags;

      for (const key of ['scheduledFor', 'dueAt', 'startAt', 'endAt', 'estimateMinutes'] as const) {
        if (existing[key] === undefined && schedulePatch[key] !== undefined) {
          patch[key] = schedulePatch[key] as never;
        }
      }

      if (Object.keys(patch).length > 0) {
        await patchRecord<Task>('tasks', existing.id, patch);
        result.tasksUpdated += 1;
      } else {
        result.skipped.push(taskDef.title);
      }
    }
  }

  return result;
}
