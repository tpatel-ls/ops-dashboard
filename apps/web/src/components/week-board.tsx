'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { addDays, format, startOfWeek } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { DEFAULT_SETTINGS, getDb, isoDay, weekDays } from '@ops-dashboard/core';
import type { Priority, Project, Task } from '@ops-dashboard/core';
import { rescheduleTask } from '@/lib/tasks';
import { useAppStore } from '@/lib/app-store';
import { OrgLaneLegend, useOrgLanes } from '@/components/org-legend';
import { cn } from '@ops-dashboard/ui';

const PRIORITY_COLOR: Record<Priority, string> = {
  0: 'transparent',
  1: 'var(--color-priority-low)',
  2: 'var(--color-priority-med)',
  3: 'var(--color-priority-urgent)',
};

export function WeekBoard() {
  const settings = useLiveQuery(async () => getDb().settings.get('singleton'));
  const weekStartsOn = (settings?.weekStartsOn ?? DEFAULT_SETTINGS.weekStartsOn) as 0 | 1;
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const days = weekDays(anchor, weekStartsOn);
  const weekStart = startOfWeek(anchor, { weekStartsOn });
  const weekEnd = addDays(weekStart, 6);

  const tasks = useLiveQuery(async () => {
    const all = await getDb().tasks.toArray();
    return all.filter((t) => !t.deletedAt && t.status !== 'archived');
  });
  const projectsMap = useLiveQuery(async () => {
    const all = await getDb().projects.toArray();
    return new Map(all.filter((p) => !p.deletedAt).map((p) => [p.id, p]));
  });
  const lanes = useOrgLanes(projectsMap);
  const visibleTasks = (tasks ?? []).filter((t) => lanes.visible(t));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const target = e.over?.id ? String(e.over.id) : null;
    if (!target) return;
    rescheduleTask(id, target);
  }

  const today = isoDay(new Date());

  return (
    <div className="flex h-full min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="flex items-center rounded-md border bg-card p-0.5">
        <button
          type="button"
          aria-label="Previous week"
          onClick={() => setAnchor((d) => addDays(d, -7))}
          className="inline-flex size-10 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setAnchor(new Date())}
          className="h-10 border-x px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Today
        </button>
        <button
          type="button"
          aria-label="Next week"
          onClick={() => setAnchor((d) => addDays(d, 7))}
          className="inline-flex size-10 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
        </div>
        <span
          aria-live="polite"
          className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground"
        >
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          <span className="truncate">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </span>
        </span>
        {lanes.showLegend ? (
          <div className="ml-auto">
            <OrgLaneLegend lanes={lanes.lanes} hidden={lanes.hidden} onToggle={lanes.toggle} />
          </div>
        ) : null}
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:min-h-[420px] sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {days.map((day) => {
            const dayIso = isoDay(day);
            const dayTasks = visibleTasks.filter((t) => t.scheduledFor === dayIso);
            return (
              <DayColumn
                key={dayIso}
                day={day}
                isoDate={dayIso}
                isToday={dayIso === today}
                tasks={dayTasks}
                projectsMap={projectsMap ?? new Map()}
                laneColor={(task) => lanes.colorOf(lanes.laneOf(task))}
              />
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}

function DayColumn({
  day,
  isoDate,
  isToday,
  tasks,
  projectsMap,
  laneColor,
}: {
  day: Date;
  isoDate: string;
  isToday: boolean;
  tasks: Task[];
  projectsMap: Map<string, Project>;
  laneColor: (task: Task) => string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: isoDate });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'surface-flat scrollbar-thin flex min-h-40 min-w-0 flex-col overflow-y-auto p-2 transition-colors sm:h-full sm:min-h-[200px]',
        isOver && 'border-primary/50 bg-primary/5',
      )}
    >
      <div className="mb-2 flex items-baseline justify-between px-1">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
            {format(day, 'EEE')}
          </div>
          <div
            className={cn(
              'text-lg font-semibold leading-none tracking-tight',
              isToday && 'text-primary',
            )}
          >
            {format(day, 'd')}
          </div>
        </div>
        <span className="font-mono text-[10px] text-subtle-foreground">{tasks.length}</span>
      </div>
      <div className="flex flex-col gap-1">
        {tasks.map((t) => (
          <DraggableCard key={t.id} task={t} projectsMap={projectsMap} laneColor={laneColor(t)} />
        ))}
        {tasks.length === 0 ? (
          <div className="flex min-h-20 items-center justify-center rounded border border-dashed px-3 text-center text-[11px] text-subtle-foreground">
            No scheduled work
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DraggableCard({
  task,
  projectsMap,
  laneColor,
}: {
  task: Task;
  projectsMap: Map<string, Project>;
  laneColor: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const openEdit = useAppStore((s) => s.openEdit);
  const style: React.CSSProperties = {
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : {}),
  };

  const project = task.projectId ? projectsMap.get(task.projectId) : undefined;

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
        'surface-flat relative min-w-0 cursor-grab touch-none select-none px-2 py-1.5 text-[12px]',
        'hover:border-border-strong',
        isDragging && 'cursor-grabbing opacity-80 shadow-lg',
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-0 w-[3px] rounded-r-full"
        style={{ background: PRIORITY_COLOR[task.priority], opacity: task.priority ? 1 : 0 }}
      />
      <div className="ml-2 flex min-w-0 items-center gap-1.5">
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]"
          style={{ background: laneColor }}
        />
        <span className="min-w-0 truncate">{task.title}</span>
      </div>
      <div className="ml-2 mt-0.5 flex min-w-0 items-center gap-1.5">
        {task.startAt ? (
          <span className="font-mono text-[10px] text-subtle-foreground">
            {format(new Date(task.startAt), 'HH:mm')}
          </span>
        ) : null}
        {project ? (
          <span
            className="inline-flex min-w-0 items-center gap-1 rounded bg-accent px-1 py-px text-[10px] text-accent-foreground"
          >
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ background: project.color }}
            />
            <span className="min-w-0 max-w-[72px] truncate">{project.name}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
