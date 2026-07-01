'use client';

import { DEFAULT_ORG_COLOR, DEFAULT_ORG_NAME, getDb } from '@ops-dashboard/core';
import type { Priority, TaskStatus } from '@ops-dashboard/core';
import { createDomain } from './domains';
import { createOrganization } from './organizations';
import { SEED_ORG_ID } from './org-setup';
import { createProject } from './projects';
import { addTask } from './tasks';

// ─── Portfolio seed data ────────────────────────────────────────────────────────
//
// The four projects the user is actively tracking. Loaded on demand (idempotent)
// rather than via ensureSeed, because ensureSeed only runs on a truly empty DB and
// the real device already has data. Created through the normal lib helpers so each
// write enqueues a sync op and lands on every signed-in device.

interface SeedTask {
  title: string;
  status: TaskStatus;
  priority: Priority;
  notes?: string;
  tags?: string[];
}

interface SeedProject {
  name: string;
  color: string;
  domain: string;
  description: string;
  tasks: SeedTask[];
}

const DOMAIN_COLORS: Record<string, string> = {
  LSG: 'oklch(0.6 0.13 265)',
  'Side Projects': 'oklch(0.68 0.14 330)',
};

export const PORTFOLIO_PROJECTS: SeedProject[] = [
  {
    name: 'Blue Text',
    color: 'oklch(0.62 0.17 255)',
    domain: 'LSG',
    description:
      'LSG blue-texting product. Tighten reliability, local presence, RAG, scripting, and the inbound AI transfer.',
    tasks: [
      {
        title: 'Blue texting capabilities air-tight',
        status: 'doing',
        priority: 3,
        notes: 'Make the core blue-bubble (iMessage) delivery rock solid and reliable end to end.',
      },
      {
        title: 'Local identity and area presence with fallback',
        status: 'todo',
        priority: 3,
        notes:
          'Limitation: true local presence needs real phone plans, not just numbers. Fallback: when there is no local-plan number for a state, call the contact from a Twilio number that matches THEIR area code. Example: we only hold 954 but the contact is 925, so call from a 925 number instead of 954.',
      },
      {
        title: 'RAG needs to be strong',
        status: 'todo',
        priority: 3,
        notes: 'Retrieval has to be reliable so replies always pull the right context.',
      },
      {
        title: 'Inbound AI transfer solid',
        status: 'todo',
        priority: 3,
        notes: 'Capture and be able to take the call so we can do a clean hand-off to a human.',
      },
      {
        title: 'Scripting tight',
        status: 'todo',
        priority: 2,
        notes: 'Conversation scripts dialed in and consistent.',
      },
      {
        title: 'Sequencing',
        status: 'todo',
        priority: 2,
        notes: 'Multi-step message and follow-up sequencing.',
      },
      {
        title: 'Branded naming',
        status: 'todo',
        priority: 2,
        notes: 'Sender and branded naming so messages carry the brand identity.',
      },
      {
        title: 'Better dashboard visuals',
        status: 'backlog',
        priority: 2,
        notes: 'Improve the visuals on the dashboard.',
      },
      {
        title: 'Scheduling with a calendar view',
        status: 'backlog',
        priority: 2,
        notes:
          'Improve the scheduling component. Add a calendar view that shows all the future things that will happen.',
      },
      {
        title: 'Apple integration (dial into Apple)',
        status: 'backlog',
        priority: 2,
        notes: 'Integrate deeper with Apple rails (iMessage, FaceTime).',
      },
    ],
  },
  {
    name: 'Power Dialer',
    color: 'oklch(0.7 0.15 165)',
    domain: 'LSG',
    description:
      'New LSG build. A power dialer that plugs into a client RingCentral or NICE system. Research first, then build the eight features. We sell processes, not outcomes.',
    tasks: [
      {
        title: 'Research feasibility and APIs (RingCentral, NICE, Apple)',
        status: 'todo',
        priority: 3,
        tags: ['research'],
        notes:
          'New project, research first. Validate each feature below, map the RingCentral and NICE APIs, and the iMessage / FaceTime callback path.',
      },
      {
        title: 'Plug into existing phone system (RingCentral or NICE)',
        status: 'backlog',
        priority: 3,
        notes:
          'Nothing gets replaced. Use their existing numbers and lines. Going live is a quick connection, not a migration.',
      },
      {
        title: 'Smart lead ordering',
        status: 'backlog',
        priority: 3,
        notes:
          'Pull the lead list (CRM or simple upload). Call the smartest order first: the people most likely to answer and buy at the top, dialed at the time of day they are most likely to pick up.',
      },
      {
        title: 'Predictive and parallel dialing',
        status: 'backlog',
        priority: 3,
        notes:
          'Call several numbers at once. Only put a rep on the line the moment a real person says hello. Filter out voicemails, busy signals, and dead numbers so reps talk instead of dial.',
      },
      {
        title: 'In-call rep assist',
        status: 'backlog',
        priority: 2,
        notes:
          'Instantly show who they are talking to plus history, surface the right script, and record and transcribe so nothing is lost.',
      },
      {
        title: 'Auto follow-up to no-answers',
        status: 'backlog',
        priority: 2,
        notes:
          'Reach every no-answer with a text, an iMessage, or a FaceTime audio callback. Several touches without a rep lifting a finger.',
      },
      {
        title: 'Auto CRM write-back',
        status: 'backlog',
        priority: 2,
        notes: 'Every call result, recording, and note lands in the CRM automatically. Zero manual data entry.',
      },
      {
        title: 'Manager live dashboard',
        status: 'backlog',
        priority: 2,
        notes:
          'Live view: people reached, total talk time, conversions, and which reps and scripts are actually working.',
      },
      {
        title: 'Overflow and AI voice agents (revenue stream)',
        status: 'backlog',
        priority: 1,
        notes:
          'When the team is maxed out or after hours, our own agents or AI voice agents catch the overflow. Becomes a second revenue stream for us.',
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
  skipped: string[];
}

/**
 * Create any missing portfolio projects (and their tasks). Idempotent: a project
 * already present by name is skipped wholesale, so re-running never duplicates.
 * Safe to call on a device that already holds the user's other data.
 */
export async function importPortfolioProjects(): Promise<ImportResult> {
  const db = getDb();

  const existingProjects = (await db.projects.toArray()).filter((p) => !p.deletedAt);
  const takenNames = new Set(existingProjects.map((p) => p.name.trim().toLowerCase()));

  const existingDomains = (await db.domains.toArray()).filter((d) => !d.deletedAt);
  const domainIdByName = new Map(existingDomains.map((d) => [d.name.trim().toLowerCase(), d.id]));

  async function ensureDomain(name: string): Promise<string> {
    const key = name.trim().toLowerCase();
    const found = domainIdByName.get(key);
    if (found) return found;
    const created = await createDomain({ name, color: DOMAIN_COLORS[name] ?? 'oklch(0.65 0.1 280)' });
    domainIdByName.set(key, created.id);
    return created.id;
  }

  const result: ImportResult = { projectsCreated: 0, tasksCreated: 0, skipped: [] };

  // LSG work lands in the seeded org lane. Deterministic id so a second
  // device racing this seed converges on the same record (see org-setup).
  const orgs = (await db.organizations.toArray()).filter((o) => !o.deletedAt);
  const seedOrg =
    orgs.find((o) => o.name.trim().toLowerCase() === DEFAULT_ORG_NAME.toLowerCase()) ??
    (await createOrganization({
      id: SEED_ORG_ID,
      name: DEFAULT_ORG_NAME,
      color: DEFAULT_ORG_COLOR,
      order: 1,
    }));

  for (const def of PORTFOLIO_PROJECTS) {
    if (takenNames.has(def.name.trim().toLowerCase())) {
      result.skipped.push(def.name);
      continue;
    }

    const domainId = await ensureDomain(def.domain);
    const project = await createProject(def.name, {
      color: def.color,
      kind: 'project',
      domainId,
      ...(def.domain === 'LSG' ? { orgId: seedOrg.id } : {}),
      description: def.description,
    });
    takenNames.add(def.name.trim().toLowerCase());
    result.projectsCreated += 1;

    for (const t of def.tasks) {
      await addTask(t.title, {
        status: t.status,
        priority: t.priority,
        projectId: project.id,
        domainId,
        ...(project.orgId ? { orgId: project.orgId } : {}),
        tags: t.tags ?? [],
        ...(t.notes ? { notes: t.notes } : {}),
      });
      result.tasksCreated += 1;
    }
  }

  return result;
}
