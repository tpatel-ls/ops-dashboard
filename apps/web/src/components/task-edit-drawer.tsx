'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bell, CalendarClock, Hash, Plus, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { getDb, newId } from '@drift/core';
import type { ChecklistItem, Priority, Task } from '@drift/core';
import { useAppStore } from '@/lib/app-store';
import { setChecklist, softDeleteTask, updateTask } from '@/lib/tasks';
import { scheduleReminder } from '@/lib/notifications';
import { cn } from '@drift/ui';

const STATUSES: Task['status'][] = ['backlog', 'todo', 'doing', 'blocked', 'done'];
const PRIORITY_LABEL: Record<Priority, string> = { 0: 'None', 1: 'Low', 2: 'Med', 3: 'Urgent' };

export function TaskEditDrawer() {
  const id = useAppStore((s) => s.editTaskId);
  const close = useAppStore((s) => s.closeEdit);
  const task = useLiveQuery(async () => (id ? getDb().tasks.get(id) : undefined), [id]);

  if (!id) return null;

  return (
    <div className="fixed inset-0 z-40 flex" onClick={close}>
      <div className="flex-1 bg-black/40 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="surface scrollbar-thin relative h-full w-full max-w-md overflow-y-auto rounded-none border-y-0 border-r-0"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-hairline bg-card px-5 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-subtle-foreground">
            Task
          </div>
          <button type="button" onClick={close} className="kbd" aria-label="Close">
            <X className="size-3" />
          </button>
        </header>
        {task ? <DrawerBody key={task.id} task={task} onClose={close} /> : (
          <div className="p-6 text-sm text-muted-foreground">Loading...</div>
        )}
      </div>
    </div>
  );
}

function DrawerBody({ task, onClose }: { task: Task; onClose: () => void }) {
  const projects = useLiveQuery(async () => getDb().projects.toArray());
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [draftNotes, setDraftNotes] = useState(task.notes ?? '');
  const [tagDraft, setTagDraft] = useState('');
  const [reminderDraft, setReminderDraft] = useState('');
  const [checklistDraft, setChecklistDraft] = useState('');

  return (
    <>
      {(
        <div className="space-y-6 p-5">
          <div>
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={() => draftTitle !== task.title && updateTask(task.id, { title: draftTitle })}
              className="w-full bg-transparent text-xl font-semibold tracking-tight outline-none"
              placeholder="Untitled"
            />
            <textarea
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              onBlur={() => draftNotes !== (task.notes ?? '') && updateTask(task.id, { notes: draftNotes })}
              className="mt-2 w-full resize-none bg-transparent text-sm text-muted-foreground outline-none"
              rows={3}
              placeholder="Notes (markdown)"
            />
          </div>

            <Section title="Status">
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateTask(task.id, { status: s })}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs capitalize',
                      task.status === s
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Priority">
              <div className="flex gap-1.5">
                {([0, 1, 2, 3] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => updateTask(task.id, { priority: p })}
                    className={cn(
                      'rounded-md border px-3 py-1 text-xs',
                      task.priority === p
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {PRIORITY_LABEL[p]}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Schedule" icon={<CalendarClock className="size-3.5" />}>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Date">
                  <input
                    type="date"
                    value={task.scheduledFor ?? ''}
                    onChange={(e) =>
                      updateTask(task.id, {
                        scheduledFor: e.target.value || undefined,
                      })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Estimate (m)">
                  <input
                    type="number"
                    min={0}
                    value={task.estimateMinutes ?? ''}
                    onChange={(e) =>
                      updateTask(task.id, {
                        estimateMinutes: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Start">
                  <input
                    type="time"
                    value={task.startAt ? format(new Date(task.startAt), 'HH:mm') : ''}
                    onChange={(e) => {
                      const day = task.scheduledFor ?? new Date().toISOString().slice(0, 10);
                      const iso = e.target.value
                        ? new Date(`${day}T${e.target.value}:00`).toISOString()
                        : undefined;
                      updateTask(task.id, { startAt: iso });
                    }}
                    className="input"
                  />
                </Field>
                <Field label="End">
                  <input
                    type="time"
                    value={task.endAt ? format(new Date(task.endAt), 'HH:mm') : ''}
                    onChange={(e) => {
                      const day = task.scheduledFor ?? new Date().toISOString().slice(0, 10);
                      const iso = e.target.value
                        ? new Date(`${day}T${e.target.value}:00`).toISOString()
                        : undefined;
                      updateTask(task.id, { endAt: iso });
                    }}
                    className="input"
                  />
                </Field>
              </div>
            </Section>

            <Section title="Project">
              <select
                value={task.projectId ?? ''}
                onChange={(e) =>
                  updateTask(task.id, { projectId: e.target.value || undefined })
                }
                className="input w-full"
              >
                <option value="">No project</option>
                {projects?.filter((p) => !p.archivedAt).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Section>

            <Section title="Tags" icon={<Hash className="size-3.5" />}>
              <div className="flex flex-wrap items-center gap-1.5">
                {task.tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      updateTask(task.id, { tags: task.tags.filter((x) => x !== t) })
                    }
                    className="group inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground"
                  >
                    #{t}
                    <X className="size-2.5 opacity-0 group-hover:opacity-100" aria-hidden />
                  </button>
                ))}
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagDraft.trim()) {
                      e.preventDefault();
                      const t = tagDraft.trim().replace(/^#/, '').toLowerCase();
                      if (!task.tags.includes(t)) {
                        updateTask(task.id, { tags: [...task.tags, t] });
                      }
                      setTagDraft('');
                    }
                  }}
                  placeholder="add tag"
                  className="bg-transparent text-xs outline-none placeholder:text-subtle-foreground"
                />
              </div>
            </Section>

            <Section title="Reminders" icon={<Bell className="size-3.5" />}>
              <div className="flex flex-col gap-1.5">
                {task.reminders.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-md border border-hairline bg-input px-2.5 py-1.5 text-xs"
                  >
                    <span className="font-mono">{format(new Date(r.triggerAt), 'EEE d MMM HH:mm')}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateTask(task.id, {
                          reminders: task.reminders.filter((x) => x.id !== r.id),
                        })
                      }
                      className="text-subtle-foreground hover:text-destructive"
                      aria-label="Remove reminder"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={reminderDraft}
                    onChange={(e) => setReminderDraft(e.target.value)}
                    className="input flex-1"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!reminderDraft) return;
                      const iso = new Date(reminderDraft).toISOString();
                      const reminder = await scheduleReminder(task.id, iso);
                      await updateTask(task.id, {
                        reminders: [...task.reminders, reminder],
                      });
                      setReminderDraft('');
                    }}
                    className="kbd"
                    aria-label="Add reminder"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>
            </Section>

            <Section title="Checklist">
              <div className="flex flex-col gap-1.5">
                {task.checklist.map((item) => (
                  <ChecklistRow key={item.id} task={task} item={item} />
                ))}
                <div className="flex items-center gap-2">
                  <input
                    value={checklistDraft}
                    onChange={(e) => setChecklistDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && checklistDraft.trim()) {
                        e.preventDefault();
                        const next: ChecklistItem[] = [
                          ...task.checklist,
                          { id: newId(), text: checklistDraft.trim(), done: false },
                        ];
                        setChecklist(task.id, next);
                        setChecklistDraft('');
                      }
                    }}
                    placeholder="New step"
                    className="input flex-1"
                  />
                </div>
              </div>
            </Section>

          <button
            type="button"
            onClick={() => {
              softDeleteTask(task.id);
              onClose();
            }}
            className="inline-flex items-center gap-2 text-xs text-destructive hover:underline"
          >
            <Trash2 className="size-3.5" />
            Delete task
          </button>
        </div>
      )}
    </>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-[10px] text-subtle-foreground">
      {label}
      {children}
    </label>
  );
}

function ChecklistRow({ task, item }: { task: Task; item: ChecklistItem }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          const next = task.checklist.map((c) =>
            c.id === item.id ? { ...c, done: !c.done } : c,
          );
          setChecklist(task.id, next);
        }}
        className={cn(
          'inline-flex size-4 items-center justify-center rounded border',
          item.done ? 'border-primary bg-primary' : 'border-border-strong',
        )}
        aria-label="Toggle"
      />
      <span
        className={cn(
          'flex-1 text-sm',
          item.done && 'text-muted-foreground line-through',
        )}
      >
        {item.text}
      </span>
      <button
        type="button"
        onClick={() => {
          const next = task.checklist.filter((c) => c.id !== item.id);
          setChecklist(task.id, next);
        }}
        className="text-subtle-foreground hover:text-destructive"
        aria-label="Remove"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
