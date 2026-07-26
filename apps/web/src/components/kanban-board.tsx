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
import { format } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Loader2,
  Pencil,
  Plus,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { getDb, matchesOrgContext, PERSONAL_COLOR } from '@ops-dashboard/core';
import type { Organization, Project, Task } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';
import { useAppStore } from '@/lib/app-store';
import { nextBoardColumn, previousBoardColumn } from '@/lib/board-actions';
import { taskLane } from '@/lib/org-lanes';
import { taskDateLabel } from '@/lib/task-presentation';
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
        <p className="text-muted-foreground text-sm">
          <span className="md:hidden">Swipe between lanes.</span>
          <span className="hidden md:inline">Drag a task to change its status.</span>
        </p>
        <span className="bg-bg-sunken text-muted-foreground rounded-full px-2.5 py-1 text-xs tabular-nums">
          {scopedTasks.length} {scopedTasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="scrollbar-thin -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-3 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
          {SIMPLE_KANBAN_COLUMNS.map((column, index) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasksForColumn(column.id)}
              projectsMap={projectsMap}
              organizationsMap={organizationsMap}
              showOrganization={ctx === 'all'}
              addOverrides={addOverrides}
              position={index + 1}
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
  position,
}: {
  column: SimpleKanbanColumn;
  tasks: Task[];
  projectsMap: Map<string, Project>;
  organizationsMap: Map<string, Organization>;
  showOrganization: boolean;
  addOverrides: Partial<Task>;
  position: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function addToColumn(event: React.FormEvent) {
    event.preventDefault();
    const input = title.trim();
    if (!input || saving) return;
    setSaving(true);
    setError(null);
    let added = false;
    try {
      await addTask(input, {
        status: statusForSimpleKanbanColumn(column.id),
        ...addOverrides,
      });
      setTitle('');
      added = true;
    } catch {
      setError('Could not add task');
    } finally {
      setSaving(false);
      if (added) {
        window.requestAnimationFrame(() => inputRef.current?.focus());
      }
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
          <p className="text-subtle-foreground mt-0.5 text-[11px]">
            {column.description}
            <span className="md:hidden"> · Lane {position} of 3</span>
          </p>
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
          ref={inputRef}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError(null);
          }}
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
          {saving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="size-4" aria-hidden />
          )}
        </button>
      </form>
      <span className={cn('mt-1 min-h-4 px-1 text-[11px]', error && 'text-destructive')}>
        {saving ? 'Adding…' : error}
      </span>
      {error ? (
        <span role="alert" className="sr-only">
          {error}. Your draft is still available.
        </span>
      ) : null}
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
  const dateValue = task.dueAt?.slice(0, 10) ?? task.scheduledFor;
  const today = format(new Date(), 'yyyy-MM-dd');
  const overdue = Boolean(task.status !== 'done' && dateValue && dateValue < today);
  const dateLabel = dateValue ? taskDateLabel(dateValue, today, task.status === 'done') : null;
  const currentColumn = simpleKanbanColumn(task.status) ?? 'todo';
  const previousColumn = previousBoardColumn(currentColumn);
  const nextColumn = nextBoardColumn(currentColumn);
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
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openEdit(task.id);
        }
      }}
      className={cn(
        'surface-flat group hover:border-border-strong min-w-0 cursor-grab touch-auto p-3 transition-all select-none',
        isDragging && 'cursor-grabbing opacity-80 shadow-lg',
      )}
    >
      <div className="flex items-start gap-2">
        <p className="line-clamp-3 min-w-0 flex-1 text-sm leading-5 font-medium">{task.title}</p>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            openEdit(task.id);
          }}
          aria-label={`Edit ${task.title}`}
          title="Edit task"
          className="text-muted-foreground hover:bg-accent hover:text-foreground -m-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors"
        >
          <Pencil className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            void updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' });
          }}
          aria-label={
            task.status === 'done' ? `Move ${task.title} to To do` : `Complete ${task.title}`
          }
          className={cn(
            '-m-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors',
            task.status === 'done'
              ? 'text-success'
              : 'text-muted-foreground hover:bg-success/10 hover:text-success',
          )}
        >
          <span
            className={cn(
              'inline-flex size-[18px] items-center justify-center rounded-full border',
              task.status === 'done' && 'border-success bg-success text-white',
            )}
            aria-hidden
          >
            {task.status === 'done' ? <Check className="size-3" strokeWidth={3} /> : null}
          </span>
        </button>
      </div>
      <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
        {dateLabel ? (
          <span
            className={cn(
              'bg-bg-sunken inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
              overdue && 'bg-destructive/10 text-destructive',
            )}
          >
            {overdue ? (
              <CircleAlert className="size-3" aria-hidden />
            ) : (
              <CalendarClock className="size-3" aria-hidden />
            )}
            {dateLabel}
          </span>
        ) : null}
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
      <div className="mt-1 flex justify-end gap-0.5 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        {previousColumn ? (
          <BoardMoveButton
            task={task}
            column={previousColumn}
            direction="previous"
            icon={<ChevronLeft className="size-4" aria-hidden />}
          />
        ) : null}
        {nextColumn ? (
          <BoardMoveButton
            task={task}
            column={nextColumn}
            direction="next"
            icon={<ChevronRight className="size-4" aria-hidden />}
          />
        ) : null}
      </div>
    </article>
  );
}

function BoardMoveButton({
  task,
  column,
  direction,
  icon,
}: {
  task: Task;
  column: SimpleKanbanColumnId;
  direction: 'previous' | 'next';
  icon: React.ReactNode;
}) {
  const label = SIMPLE_KANBAN_COLUMNS.find((candidate) => candidate.id === column)?.label ?? column;
  return (
    <button
      type="button"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        void updateTask(task.id, { status: statusForSimpleKanbanColumn(column) });
      }}
      aria-label={`Move ${task.title} to ${label}`}
      title={`Move to ${label}`}
      className="text-subtle-foreground hover:bg-accent hover:text-foreground inline-flex size-11 items-center justify-center rounded-md transition-colors md:size-8"
    >
      {icon}
      <span className="sr-only">{direction} lane</span>
    </button>
  );
}
