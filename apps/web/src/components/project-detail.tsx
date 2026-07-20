'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useRef, useEffect } from 'react';
import {
  Check,
  CheckSquare,
  ChevronRight,
  Layers,
  ListChecks,
  Plus,
  Timer,
  X,
} from 'lucide-react';
import { getDb, newId } from '@ops-dashboard/core';
import type {
  ChecklistItem,
  Domain,
  Milestone,
  NamedChecklist,
  Project,
  ProjectKind,
  ProjectStatus,
  Task,
} from '@ops-dashboard/core';
import { patchRecord } from '@/lib/records';
import { logWork } from '@/lib/worklogs';
import { addTaskToProject, setTaskStatus, updateTask } from '@/lib/tasks';
import { useActiveOrgs } from '@/components/org-switcher';
import { useAppStore } from '@/lib/app-store';
import { cn } from '@ops-dashboard/ui';

// ─── Status + kind labels ────────────────────────────────────────────────────

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  done: 'Done',
  archived: 'Archived',
};

const KIND_LABELS: Record<ProjectKind, string> = {
  project: 'Project',
  area: 'Area',
  retainer: 'Retainer',
};

const STATUS_CLASSES: Record<ProjectStatus, string> = {
  active: 'border-success/30 bg-success/10 text-success',
  paused: 'border-warning/30 bg-warning/10 text-warning',
  done: 'border-border bg-bg-sunken text-muted-foreground',
  archived: 'border-border bg-bg-sunken text-subtle-foreground',
};

// ─── Milestone section ───────────────────────────────────────────────────────

function MilestonesSection({ project }: { project: Project }) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDue, setNewDue] = useState('');

  const milestones = project.milestones ?? [];
  const done = milestones.filter((m) => m.done).length;
  const pct = milestones.length > 0 ? Math.round((done / milestones.length) * 100) : 0;

  async function addMilestone() {
    const title = newTitle.trim();
    if (!title) return;
    const milestone: Milestone = {
      id: newId(),
      title,
      done: false,
      ...(newDue ? { dueAt: newDue } : {}),
    };
    await patchRecord<Project>('projects', project.id, {
      milestones: [...milestones, milestone],
    });
    setNewTitle('');
    setNewDue('');
    setAdding(false);
  }

  async function toggleMilestone(id: string) {
    const updated = milestones.map((m) => (m.id === id ? { ...m, done: !m.done } : m));
    await patchRecord<Project>('projects', project.id, { milestones: updated });
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
            Milestones
          </span>
        </div>
        <div className="flex items-center gap-2">
          {milestones.length > 0 ? (
            <span className="font-mono text-[10px] text-muted-foreground">
              {done}/{milestones.length} · {pct}%
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-3" /> Add
          </button>
        </div>
      </div>

      {milestones.length > 0 ? (
        <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-sunken">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}

      {adding ? (
        <div className="surface-flat flex flex-col gap-2 p-3">
          <input
            className="input"
            placeholder="Milestone title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') addMilestone();
              if (e.key === 'Escape') setAdding(false);
            }}
          />
          <input
            type="date"
            className="input"
            placeholder="Due date (optional)"
            value={newDue}
            onChange={(e) => setNewDue(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-md px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addMilestone}
              disabled={!newTitle.trim()}
              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      ) : null}

      {milestones.length === 0 && !adding ? (
        <p className="text-xs text-subtle-foreground">No milestones yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {milestones.map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleMilestone(m.id)}
                className={cn(
                  'inline-flex size-4 shrink-0 items-center justify-center rounded border transition-all',
                  m.done
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border-strong text-transparent hover:border-primary',
                )}
                aria-label={m.done ? 'Mark incomplete' : 'Mark done'}
              >
                <Check className="size-2.5" strokeWidth={3} />
              </button>
              <span className={cn('flex-1 text-sm', m.done && 'text-muted-foreground line-through')}>
                {m.title}
              </span>
              {m.dueAt ? (
                <span className="font-mono text-[10px] text-subtle-foreground">{m.dueAt}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Named checklists ────────────────────────────────────────────────────────

function ChecklistsSection({ project }: { project: Project }) {
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [expandedList, setExpandedList] = useState<string | null>(null);

  const checklists = project.checklists ?? [];

  async function addList() {
    const name = newListName.trim();
    if (!name) return;
    const list: NamedChecklist = { id: newId(), name, items: [] };
    await patchRecord<Project>('projects', project.id, { checklists: [...checklists, list] });
    setNewListName('');
    setAddingList(false);
    setExpandedList(list.id);
  }

  async function addItem(listId: string, text: string) {
    const item: ChecklistItem = { id: newId(), text, done: false };
    const updated = checklists.map((cl) =>
      cl.id === listId ? { ...cl, items: [...cl.items, item] } : cl,
    );
    await patchRecord<Project>('projects', project.id, { checklists: updated });
  }

  async function toggleItem(listId: string, itemId: string) {
    const updated = checklists.map((cl) =>
      cl.id === listId
        ? { ...cl, items: cl.items.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)) }
        : cl,
    );
    await patchRecord<Project>('projects', project.id, { checklists: updated });
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
            Checklists
          </span>
        </div>
        <button
          type="button"
          onClick={() => setAddingList(true)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3" /> Add checklist
        </button>
      </div>

      {addingList ? (
        <div className="surface-flat flex gap-2 p-2">
          <input
            className="input flex-1"
            placeholder="Checklist name"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') addList();
              if (e.key === 'Escape') setAddingList(false);
            }}
          />
          <button
            type="button"
            onClick={addList}
            disabled={!newListName.trim()}
            className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setAddingList(false)}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      {checklists.length === 0 && !addingList ? (
        <p className="text-xs text-subtle-foreground">No checklists yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {checklists.map((cl) => (
            <ChecklistGroup
              key={cl.id}
              checklist={cl}
              expanded={expandedList === cl.id}
              onToggleExpand={() => setExpandedList(expandedList === cl.id ? null : cl.id)}
              onToggleItem={(itemId) => toggleItem(cl.id, itemId)}
              onAddItem={(text) => addItem(cl.id, text)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ChecklistGroup({
  checklist,
  expanded,
  onToggleExpand,
  onToggleItem,
  onAddItem,
}: {
  checklist: NamedChecklist;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleItem: (id: string) => void;
  onAddItem: (text: string) => void;
}) {
  const [addingItem, setAddingItem] = useState(false);
  const [itemText, setItemText] = useState('');
  const done = checklist.items.filter((it) => it.done).length;

  return (
    <div className="surface-flat overflow-hidden">
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-bg-sunken"
      >
        <ChevronRight
          className={cn('size-3.5 text-muted-foreground transition-transform', expanded && 'rotate-90')}
          aria-hidden
        />
        <span className="flex-1 text-sm font-medium">{checklist.name}</span>
        <span className="font-mono text-[10px] text-subtle-foreground">
          {done}/{checklist.items.length}
        </span>
      </button>
      {expanded ? (
        <div className="border-t border-border px-3 pb-2 pt-1">
          <ul className="flex flex-col gap-1 pb-1">
            {checklist.items.length === 0 ? (
              <li className="text-xs text-subtle-foreground py-1">Empty checklist.</li>
            ) : (
              checklist.items.map((it) => (
                <li key={it.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleItem(it.id)}
                    className={cn(
                      'inline-flex size-4 shrink-0 items-center justify-center rounded border transition-all',
                      it.done
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border-strong text-transparent hover:border-primary',
                    )}
                    aria-label={it.done ? 'Uncheck' : 'Check'}
                  >
                    <Check className="size-2.5" strokeWidth={3} />
                  </button>
                  <span className={cn('flex-1 text-sm', it.done && 'text-muted-foreground line-through')}>
                    {it.text}
                  </span>
                </li>
              ))
            )}
          </ul>
          {addingItem ? (
            <div className="mt-1 flex gap-2">
              <input
                className="input flex-1"
                placeholder="Item text"
                value={itemText}
                onChange={(e) => setItemText(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && itemText.trim()) {
                    onAddItem(itemText.trim());
                    setItemText('');
                    setAddingItem(false);
                  }
                  if (e.key === 'Escape') setAddingItem(false);
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (itemText.trim()) {
                    onAddItem(itemText.trim());
                    setItemText('');
                  }
                  setAddingItem(false);
                }}
                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingItem(true)}
              className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <Plus className="size-3" /> Add item
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ─── Linked tasks ────────────────────────────────────────────────────────────

function LinkedTasksSection({ project }: { project: Project }) {
  const openEdit = useAppStore((s) => s.openEdit);
  const [adding, setAdding] = useState('');
  const [saving, setSaving] = useState(false);

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    const text = adding.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      // NL parsing applies (dates, #tags, !!); the task inherits the
      // project's domain + org lane. Input stays put for rapid entry.
      await addTaskToProject(text, project);
      setAdding('');
    } finally {
      setSaving(false);
    }
  }

  const tasks = useLiveQuery(
    async () => {
      const all = await getDb().tasks.toArray();
      return all
        .filter((t) => !t.deletedAt && t.status !== 'archived' && t.projectId === project.id)
        .sort((a, b) => {
          if (a.status === 'done' && b.status !== 'done') return 1;
          if (b.status === 'done' && a.status !== 'done') return -1;
          return a.order - b.order;
        });
    },
    [project.id],
  );

  if (!tasks) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <CheckSquare className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
          Tasks
        </span>
        <span className="ml-auto font-mono text-[10px] text-subtle-foreground">
          {tasks.filter((t) => t.status !== 'done').length} open
        </span>
      </div>
      <form
        onSubmit={submitAdd}
        className="hairline flex items-center gap-1.5 rounded-md border bg-bg-sunken px-2 py-1.5 focus-within:border-primary/50"
      >
        <Plus className="size-3 shrink-0 text-muted-foreground" aria-hidden />
        <input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          placeholder="Add a task... (try: call Bryan tomorrow 2pm !!)"
          disabled={saving}
          className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-subtle-foreground"
        />
        <span className="kbd hidden sm:inline">Enter</span>
      </form>
      {tasks.length === 0 ? (
        <p className="text-xs text-subtle-foreground">No tasks linked to this project.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} onOpen={() => openEdit(t.id)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function TaskRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const done = task.status === 'done';
  return (
    <li
      className={cn(
        'group surface-flat flex items-center gap-2.5 px-3 py-2 transition-all hover:border-border-strong',
        done && 'opacity-60',
      )}
    >
      <button
        type="button"
        onClick={() => setTaskStatus(task.id, done ? 'todo' : 'done')}
        className={cn(
          'inline-flex size-4 shrink-0 items-center justify-center rounded-full border transition-all',
          done
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border-strong text-transparent hover:border-primary',
        )}
        aria-label={`${done ? 'Mark as todo' : 'Mark as done'}: ${task.title}`}
      >
        <Check className="size-2.5" strokeWidth={3} />
      </button>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Edit task: ${task.title}`}
        className={cn('min-w-0 flex-1 truncate text-left text-sm outline-none focus-visible:text-primary', done && 'text-muted-foreground line-through')}
      >
        {task.title}
      </button>
    </li>
  );
}

// ─── Log work ─────────────────────────────────────────────────────────────────

function LogWorkSection({ project }: { project: Project }) {
  const [minutes, setMinutes] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const totalHours = useLiveQuery(async () => {
    const all = await getDb().workLogs.toArray();
    const sum = all
      .filter((w) => !w.deletedAt && w.projectId === project.id)
      .reduce((acc, w) => acc + w.minutes, 0);
    return (sum / 60).toFixed(1);
  }, [project.id]);

  async function handleLog() {
    const mins = parseInt(minutes, 10);
    if (!mins || mins <= 0) return;
    setSaving(true);
    try {
      await logWork(project.id, mins, note.trim() || undefined);
      setMinutes('');
      setNote('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Timer className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
          Log work
        </span>
        {totalHours !== undefined ? (
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
            {totalHours}h total
          </span>
        ) : null}
      </div>
      <div className="surface-flat flex flex-col gap-2 p-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Set work minutes">
          {['15', '30', '60'].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={minutes === value}
              onClick={() => setMinutes(value)}
              className={cn(
                'min-h-8 rounded-md border px-2.5 text-[11px] font-medium transition-colors',
                minutes === value
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {value}m
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <label htmlFor={`project-${project.id}-minutes`} className="sr-only">Minutes worked</label>
          <input
            id={`project-${project.id}-minutes`}
            type="number"
            min={1}
            placeholder="Minutes"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="input w-28"
          />
          <label htmlFor={`project-${project.id}-note`} className="sr-only">Progress note</label>
          <input
            id={`project-${project.id}-note`}
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input flex-1"
            onKeyDown={(e) => { if (e.key === 'Enter') handleLog(); }}
          />
          <button
            type="button"
            onClick={handleLog}
            disabled={saving || !minutes || parseInt(minutes, 10) <= 0}
            className="min-h-11 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            Log
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Meta / editable fields ───────────────────────────────────────────────────

function MetaSection({ project, domains }: { project: Project; domains: Domain[] }) {
  const orgs = useActiveOrgs();

  async function set<K extends keyof Project>(key: K, value: Project[K]) {
    await patchRecord<Project>('projects', project.id, { [key]: value } as Partial<Project>);
  }

  async function setOrg(orgId: string) {
    // Clears travel as SQL null: the sync mapper drops absent keys, so an
    // undefined would leave the previous lane on other devices.
    const value = (orgId || null) as unknown as Project['orgId'];
    await patchRecord<Project>('projects', project.id, { orgId: value });
    // orgId is denormalized onto tasks; cascade so lists/calendar move too.
    const tasks = await getDb().tasks.where('projectId').equals(project.id).toArray();
    for (const t of tasks) {
      if (t.deletedAt) continue;
      await updateTask(t.id, { orgId: value as Task['orgId'] });
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="grid gap-2 text-sm">
        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="w-20 text-xs text-muted-foreground">Status</span>
          <select
            value={project.status}
            onChange={(e) => set('status', e.target.value as ProjectStatus)}
            className="input flex-1"
          >
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        {/* Kind */}
        <div className="flex items-center gap-2">
          <span className="w-20 text-xs text-muted-foreground">Kind</span>
          <select
            value={project.kind}
            onChange={(e) => set('kind', e.target.value as ProjectKind)}
            className="input flex-1"
          >
            {Object.entries(KIND_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        {/* Organization */}
        <div className="flex items-center gap-2">
          <span className="w-20 text-xs text-muted-foreground">Org</span>
          <select
            value={project.orgId ?? ''}
            onChange={(e) => void setOrg(e.target.value)}
            className="input flex-1"
          >
            <option value="">Personal</option>
            {(orgs ?? []).map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        {/* Domain */}
        <div className="flex items-center gap-2">
          <span className="w-20 text-xs text-muted-foreground">Domain</span>
          <select
            value={project.domainId ?? ''}
            onChange={(e) => set('domainId', e.target.value || undefined)}
            className="input flex-1"
          >
            <option value="">- none -</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        {/* Due date */}
        <div className="flex items-center gap-2">
          <span className="w-20 text-xs text-muted-foreground">Due</span>
          <input
            type="date"
            value={project.dueDate ?? ''}
            onChange={(e) => set('dueDate', e.target.value || undefined)}
            className="input flex-1"
          />
        </div>
      </div>
    </section>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface ProjectDetailProps {
  project: Project;
  onClose: () => void;
  domains: Domain[];
}

export function ProjectDetail({ project, onClose, domains }: ProjectDetailProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-detail-title"
        className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl"
      >
        {/* Header */}
        <div className="hairline flex items-start justify-between border-b px-3 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2.5">
            <span
              className="size-4 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
              style={{ background: project.color }}
            />
            <div>
              <h2 id="project-detail-title" className="text-[15px] font-semibold leading-tight">{project.name}</h2>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
                  {KIND_LABELS[project.kind]}
                </span>
                <span className={cn('rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', STATUS_CLASSES[project.status])}>
                  {STATUS_LABELS[project.status]}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="scrollbar-thin flex-1 overflow-y-auto p-3 sm:p-5">
          <div className="flex flex-col gap-5 sm:gap-6">
            {project.description ? (
              <p className="text-sm text-muted-foreground">{project.description}</p>
            ) : null}

            <MetaSection project={project} domains={domains} />

            <div className="hairline border-t" />
            <MilestonesSection project={project} />

            <div className="hairline border-t" />
            <ChecklistsSection project={project} />

            <div className="hairline border-t" />
            <LinkedTasksSection project={project} />

            <div className="hairline border-t" />
            <LogWorkSection project={project} />
          </div>
        </div>
      </div>
    </div>
  );
}
