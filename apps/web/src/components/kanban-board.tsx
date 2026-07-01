'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { getDb, matchesOrgContext } from '@ops-dashboard/core';
import type { Project, Task } from '@ops-dashboard/core';
import { addTask, updateTask } from '@/lib/tasks';
import { useAppStore } from '@/lib/app-store';
import { taskLane } from '@/lib/org-lanes';
import { useOrgStore } from '@/lib/org-store';
import { cn } from '@ops-dashboard/ui';

type Grouping = 'status' | 'project' | 'priority' | 'tag';

interface Column {
  id: string;
  label: string;
  hint?: string;
  color: string;
}

const STATUS_COLUMNS: Column[] = [
  { id: 'backlog', label: 'Backlog', color: 'var(--color-subtle-foreground)' },
  { id: 'todo', label: 'Todo', color: 'var(--color-priority-low)' },
  { id: 'doing', label: 'Doing', color: 'var(--color-warning)' },
  { id: 'blocked', label: 'Blocked', color: 'var(--color-destructive)' },
  { id: 'done', label: 'Done', color: 'var(--color-success)' },
];

const PRIORITY_COLUMNS: Column[] = [
  { id: '3', label: 'Urgent', color: 'var(--color-priority-urgent)' },
  { id: '2', label: 'High', color: 'var(--color-priority-high)' },
  { id: '1', label: 'Low', color: 'var(--color-priority-low)' },
  { id: '0', label: 'None', color: 'var(--color-subtle-foreground)' },
];

export function KanbanBoard() {
  const [grouping, setGrouping] = useState<Grouping>('status');
  const tasks = useLiveQuery(async () => {
    const all = await getDb().tasks.toArray();
    return all.filter((t) => !t.deletedAt && t.status !== 'archived');
  });
  const projects = useLiveQuery(async () => getDb().projects.toArray());

  const projectsMap = useMemo(
    () => new Map((projects ?? []).map((p) => [p.id, p])),
    [projects],
  );

  const ctx = useOrgStore((s) => s.ctx);
  const scopedTasks = useMemo(
    () => (tasks ?? []).filter((t) => matchesOrgContext(taskLane(t, projectsMap), ctx)),
    [tasks, projectsMap, ctx],
  );
  // Tasks added inline under an org lens land in that lane.
  const addOverrides: Partial<Task> = ctx !== 'all' && ctx !== 'personal' ? { orgId: ctx } : {};

  const columns = useMemo<Column[]>(() => {
    if (grouping === 'status') return STATUS_COLUMNS;
    if (grouping === 'priority') return PRIORITY_COLUMNS;
    if (grouping === 'project') {
      const cols: Column[] = [{ id: '__none', label: 'No project', color: 'oklch(0.55 0.04 280)' }];
      for (const p of projects ?? []) {
        if (p.archivedAt) continue;
        if (!matchesOrgContext(p.orgId, ctx)) continue;
        cols.push({ id: p.id, label: p.name, color: p.color });
      }
      return cols;
    }
    const tagSet = new Set<string>();
    for (const t of scopedTasks) for (const tag of t.tags) tagSet.add(tag);
    const list = Array.from(tagSet).sort();
    return list.length
      ? list.map((tag) => ({ id: tag, label: `#${tag}`, color: 'oklch(0.65 0.18 280)' }))
      : [{ id: '__notag', label: 'No tag', color: 'oklch(0.55 0.04 280)' }];
  }, [grouping, projects, scopedTasks, ctx]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function bucketOf(task: Task): string {
    if (grouping === 'status') return task.status;
    if (grouping === 'priority') return String(task.priority);
    if (grouping === 'project') return task.projectId ?? '__none';
    return task.tags[0] ?? '__notag';
  }

  function onDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const id = String(e.active.id);
    const target = String(e.over.id);
    const task = tasks?.find((t) => t.id === id);
    if (!task) return;
    if (grouping === 'status') {
      updateTask(id, { status: target as Task['status'] });
    } else if (grouping === 'priority') {
      const p = Number(target);
      if (p >= 0 && p <= 3) updateTask(id, { priority: p as Task['priority'] });
    } else if (grouping === 'project') {
      const proj = target === '__none' ? undefined : projectsMap.get(target);
      // Clears travel as SQL null: the sync mapper drops absent keys, so an
      // undefined here would leave the previous value on other devices.
      updateTask(id, {
        projectId: (target === '__none' ? null : target) as unknown as Task['projectId'],
        orgId: (proj?.orgId ?? null) as unknown as Task['orgId'],
      });
    } else {
      const newTags = target === '__notag' ? task.tags : Array.from(new Set([target, ...task.tags]));
      updateTask(id, { tags: newTags });
    }
  }

  return (
    <div className="flex h-full min-w-0 flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
          Group by
        </span>
        {(['status', 'project', 'priority', 'tag'] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGrouping(g)}
            className={cn(
              'rounded-md border px-2.5 py-1 text-xs capitalize',
              grouping === g
                ? 'border-primary bg-primary/10 text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {g}
          </button>
        ))}
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="scrollbar-thin flex flex-1 gap-3 overflow-x-auto pb-2">
          {columns.map((col) => {
            const bucket = scopedTasks.filter((t) => bucketOf(t) === col.id);
            return (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={bucket}
                grouping={grouping}
                projectsMap={projectsMap}
                addOverrides={addOverrides}
              />
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}

function KanbanColumn({
  column,
  tasks,
  grouping,
  projectsMap,
  addOverrides,
}: {
  column: Column;
  tasks: Task[];
  grouping: Grouping;
  projectsMap: Map<string, Project>;
  addOverrides: Partial<Task>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [adding, setAdding] = useState('');
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'surface-flat scrollbar-thin flex h-full min-h-[320px] w-[280px] shrink-0 flex-col overflow-hidden p-2 transition-colors',
        isOver && 'border-primary/50 bg-primary/5',
      )}
    >
      <div className="mb-2 flex items-center gap-2 px-1.5">
        <span aria-hidden className="size-2 rounded-full" style={{ background: column.color }} />
        <span className="text-sm font-semibold tracking-tight">{column.label}</span>
        <span className="ml-auto font-mono text-[10px] text-subtle-foreground">{tasks.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
        {tasks.map((t) => (
          <KanbanCard key={t.id} task={t} grouping={grouping} projectsMap={projectsMap} />
        ))}
      </div>
      {grouping === 'status' ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const text = adding.trim();
            if (!text) return;
            await addTask(text, { status: column.id as Task['status'], ...addOverrides });
            setAdding('');
          }}
          className="mt-2 flex items-center gap-1.5 rounded-md border bg-input px-2 py-1.5"
        >
          <Plus className="size-3 text-muted-foreground" aria-hidden />
          <input
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            placeholder="New task"
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-subtle-foreground"
          />
        </form>
      ) : null}
    </div>
  );
}

function KanbanCard({
  task,
  grouping,
  projectsMap,
}: {
  task: Task;
  grouping: Grouping;
  projectsMap: Map<string, Project>;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const openEdit = useAppStore((s) => s.openEdit);
  const style: React.CSSProperties | undefined = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  const project =
    grouping !== 'project' && task.projectId ? projectsMap.get(task.projectId) : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        openEdit(task.id);
      }}
      className={cn(
        'surface-flat cursor-grab touch-none select-none px-2.5 py-2 text-[13px] transition-colors',
        'hover:border-border-strong',
        isDragging && 'cursor-grabbing opacity-80 shadow-lg',
      )}
    >
      <div className="truncate">{task.title}</div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-subtle-foreground">
        {task.priority > 0 ? <span className="font-mono">!{task.priority}</span> : null}
        {project ? (
          <span
            className="inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-accent-foreground"
          >
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ background: project.color }}
            />
            <span className="max-w-[80px] truncate">{project.name}</span>
          </span>
        ) : null}
        {task.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="rounded bg-accent px-1.5 py-0.5">
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
}
