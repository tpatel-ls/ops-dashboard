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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DEFAULT_SETTINGS, getDb, isoDay, weekDays } from '@drift/core';
import type { Priority, Task } from '@drift/core';
import { rescheduleTask } from '@/lib/tasks';
import { useAppStore } from '@/lib/app-store';
import { cn } from '@drift/ui';

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

  const tasks = useLiveQuery(async () => {
    const all = await getDb().tasks.toArray();
    return all.filter((t) => !t.deletedAt && t.status !== 'archived');
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const target = e.over?.id ? String(e.over.id) : null;
    if (!target) return;
    rescheduleTask(id, target);
  }

  const today = isoDay(new Date());

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous week"
          onClick={() => setAnchor((d) => addDays(d, -7))}
          className="kbd"
        >
          <ChevronLeft className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => setAnchor(new Date())}
          className="rounded-md border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Today
        </button>
        <button
          type="button"
          aria-label="Next week"
          onClick={() => setAnchor((d) => addDays(d, 7))}
          className="kbd"
        >
          <ChevronRight className="size-3" />
        </button>
        <span className="ml-2 font-mono text-[11px] text-subtle-foreground">
          Week of {format(startOfWeek(anchor, { weekStartsOn }), 'MMM d, yyyy')}
        </span>
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid h-full min-h-[420px] flex-1 grid-cols-1 gap-2 overflow-x-auto sm:grid-cols-7">
          {days.map((day) => {
            const dayIso = isoDay(day);
            const dayTasks = (tasks ?? []).filter((t) => t.scheduledFor === dayIso);
            return (
              <DayColumn
                key={dayIso}
                day={day}
                isoDate={dayIso}
                isToday={dayIso === today}
                tasks={dayTasks}
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
}: {
  day: Date;
  isoDate: string;
  isToday: boolean;
  tasks: Task[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: isoDate });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'surface-flat scrollbar-thin flex h-full min-h-[200px] min-w-[180px] flex-col overflow-y-auto p-2 transition-colors',
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
          <DraggableCard key={t.id} task={t} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const openEdit = useAppStore((s) => s.openEdit);
  const style: React.CSSProperties | undefined = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

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
        'surface-flat relative cursor-grab touch-none select-none px-2 py-1.5 text-[12px]',
        'hover:border-border-strong',
        isDragging && 'cursor-grabbing opacity-80 shadow-lg',
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-0 w-[3px] rounded-r-full"
        style={{ background: PRIORITY_COLOR[task.priority], opacity: task.priority ? 1 : 0 }}
      />
      <div className="ml-2 truncate">{task.title}</div>
      {task.startAt ? (
        <div className="ml-2 mt-0.5 font-mono text-[10px] text-subtle-foreground">
          {format(new Date(task.startAt), 'HH:mm')}
        </div>
      ) : null}
    </div>
  );
}
