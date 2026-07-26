'use client';

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getDb, matchesOrgContext, PERSONAL_COLOR } from '@ops-dashboard/core';
import type { Organization, Project, Task } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';
import { useAppStore } from '@/lib/app-store';
import { taskLane } from '@/lib/org-lanes';
import {
  SIMPLE_KANBAN_COLUMNS,
  simpleKanbanColumn,
  statusForSimpleKanbanColumn,
  type SimpleKanbanColumn,
  type SimpleKanbanColumnId,
} from '@/lib/simple-kanban';
import { addTask, updateTask } from '@/lib/tasks';
import { useOrgStore } from '@/lib/org-store';

const PRIORITY_LABEL = ['', '', 'Important', 'Critical'] as const;

export function KanbanBoard() {
  const data = useLiveQuery(async () => {
    const db = getDb();
    const [tasks, projects, organizations] = await Promise.all([
      db.tasks.toArray(),
      db.projects.toArray(),
      db.organizations.toArray(),
    ]);
    return {
      tasks: tasks.filter((task) => !task.deletedAt && task.status !== 'archived'),
      projects: projects.filter((project) => !project.deletedAt),
      organizations: organizations.filter(
        (organization) => !organization.deletedAt && !organization.archivedAt,
      ),
    };
  });

  const projectsMap = useMemo(
    () => new Map((data?.projects ?? []).map((project) => [project.id, project])),
    [data?.projects],
  );
  const organizationsMap = useMemo(
    () =>
      new Map((data?.organizations ?? []).map((organization) => [organization.id, organization])),
    [data?.organizations],
  );
  const ctx = useOrgStore((state) => state.ctx);
  const scopedTasks = useMemo(
    () => (data?.tasks ?? []).filter((task) => matchesOrgContext(taskLane(task, projectsMap), ctx)),
    [ctx, data?.tasks, projectsMap],
  );
  const addOverrides: Partial<Task> = ctx !== 'all' && ctx !== 'personal' ? { orgId: ctx } : {};
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function tasksForColumn(columnId: SimpleKanbanColumnId): Task[] {
    return scopedTasks.filter((task) => simpleKanbanColumn(task.status) === columnId);
  }

  function onDragEnd(event: DragEndEvent) {
    if (!event.over) return;
    const taskId = String(event.active.id);
    const columnId = String(event.over.id) as SimpleKanbanColumnId;
    void updateTask(taskId, { status: statusForSimpleKanbanColumn(columnId) });
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-muted-foreground text-sm">Drag a task to change its status.</p>
        <span className="bg-bg-sunken text-muted-foreground rounded-full px-2.5 py-1 text-xs tabular-nums">
          {scopedTasks.length} {scopedTasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="scrollbar-thin -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-3 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
          {SIMPLE_KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasksForColumn(column.id)}
              projectsMap={projectsMap}
              organizationsMap={organizationsMap}
              showOrganization={ctx === 'all'}
              addOverrides={addOverrides}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function KanbanColumn({
  column,
  tasks,
  projectsMap,
  organizationsMap,
  showOrganization,
  addOverrides,
}: {
  column: SimpleKanbanColumn;
  tasks: Task[];
  projectsMap: Map<string, Project>;
  organizationsMap: Map<string, Organization>;
  showOrganization: boolean;
  addOverrides: Partial<Task>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  async function addToColumn(event: React.FormEvent) {
    event.preventDefault();
    const input = title.trim();
    if (!input || saving) return;
    setSaving(true);
    try {
      await addTask(input, {
        status: statusForSimpleKanbanColumn(column.id),
        ...addOverrides,
      });
      setTitle('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`board-${column.id}`}
      className={cn(
        'surface-flat flex min-h-[62vh] w-[calc(100vw-2rem)] max-w-[380px] shrink-0 snap-center flex-col overflow-hidden p-2.5 transition-colors md:min-h-[560px] md:w-auto md:max-w-none md:snap-none',
        isOver && 'border-primary/55 bg-primary/5',
      )}
    >
      <header className="mb-2 flex items-center gap-2 px-1.5 py-1">
        <span className="size-2.5 rounded-full" style={{ background: column.color }} aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id={`board-${column.id}`} className="text-sm font-semibold">
            {column.label}
          </h2>
          <p className="text-subtle-foreground mt-0.5 text-[11px]">{column.description}</p>
        </div>
        <span className="bg-bg-sunken text-muted-foreground ml-auto rounded-full px-2 py-0.5 text-xs tabular-nums">
          {tasks.length}
        </span>
      </header>

      <div className="scrollbar-thin flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              project={task.projectId ? projectsMap.get(task.projectId) : undefined}
              organizationId={taskLane(task, projectsMap)}
              organizationsMap={organizationsMap}
              showOrganization={showOrganization}
            />
          ))
        ) : (
          <p className="text-subtle-foreground flex min-h-24 items-center justify-center rounded-lg border border-dashed px-4 text-center text-xs">
            No tasks here
          </p>
        )}
      </div>

      <form
        onSubmit={addToColumn}
        aria-label={`Add task to ${column.label}`}
        className="bg-input focus-within:border-ring mt-2 flex min-w-0 items-center gap-1.5 rounded-lg border px-2 py-1.5"
      >
        <Plus className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add task"
          aria-label={`New task in ${column.label}`}
          disabled={saving}
          className="placeholder:text-subtle-foreground min-h-8 min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <button
          type="submit"
          disabled={!title.trim() || saving}
          aria-label={`Add task to ${column.label}`}
          className="text-primary hover:bg-primary/10 inline-flex size-9 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </form>
    </section>
  );
}

function KanbanCard({
  task,
  project,
  organizationId,
  organizationsMap,
  showOrganization,
}: {
  task: Task;
  project?: Project;
  organizationId?: string;
  organizationsMap: Map<string, Organization>;
  showOrganization: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const openEdit = useAppStore((state) => state.openEdit);
  const organization = organizationId ? organizationsMap.get(organizationId) : undefined;
  const style: React.CSSProperties | undefined = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      aria-label={`Open ${task.title}`}
      onClick={() => openEdit(task.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openEdit(task.id);
        }
      }}
      className={cn(
        'surface-flat hover:border-border-strong min-w-0 cursor-grab touch-auto p-3 transition-all select-none',
        isDragging && 'cursor-grabbing opacity-80 shadow-lg',
      )}
    >
      <p className="line-clamp-3 text-sm leading-5 font-medium">{task.title}</p>
      <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
        {task.status === 'blocked' ? (
          <span className="bg-destructive/12 text-destructive rounded-full px-2 py-0.5 font-medium">
            Blocked
          </span>
        ) : null}
        {task.priority >= 2 ? (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 font-medium',
              task.priority === 3
                ? 'bg-destructive/12 text-destructive'
                : 'bg-warning/12 text-warning',
            )}
          >
            {PRIORITY_LABEL[task.priority]}
          </span>
        ) : null}
        {project ? (
          <span className="bg-bg-sunken inline-flex min-w-0 items-center gap-1.5 rounded-full px-2 py-0.5">
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: project.color }}
              aria-hidden
            />
            <span className="max-w-32 truncate">{project.name}</span>
          </span>
        ) : null}
        {showOrganization ? (
          <span className="bg-bg-sunken inline-flex min-w-0 items-center gap-1.5 rounded-full px-2 py-0.5">
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: organization?.color ?? PERSONAL_COLOR }}
              aria-hidden
            />
            <span className="max-w-28 truncate">{organization?.name ?? 'Personal'}</span>
          </span>
        ) : null}
      </div>
    </article>
  );
}
