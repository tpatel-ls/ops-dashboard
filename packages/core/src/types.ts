export type ID = string;

export type TaskStatus = 'backlog' | 'todo' | 'doing' | 'blocked' | 'done' | 'archived';
export type Priority = 0 | 1 | 2 | 3;

export interface ChecklistItem {
  id: ID;
  text: string;
  done: boolean;
}

export interface RecurrenceRule {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  byDay?: Array<'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'>;
  endsOn?: string;
  count?: number;
}

export interface Reminder {
  id: ID;
  taskId: ID;
  triggerAt: string;
  delivered: boolean;
}

export interface Task {
  id: ID;
  title: string;
  notes?: string;
  status: TaskStatus;
  priority: Priority;
  scheduledFor?: string;
  dueAt?: string;
  startAt?: string;
  endAt?: string;
  estimateMinutes?: number;
  actualMinutes?: number;
  tags: string[];
  projectId?: ID;
  parentId?: ID;
  order: number;
  recurrence?: RecurrenceRule;
  reminders: Reminder[];
  checklist: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  version: number;
  deviceId: string;
  deletedAt?: string;
}

export interface Project {
  id: ID;
  name: string;
  color: string;
  icon?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  deviceId: string;
  deletedAt?: string;
}

export interface Whiteboard {
  id: ID;
  name: string;
  document: unknown;
  linkedTaskIds: ID[];
  createdAt: string;
  updatedAt: string;
  version: number;
  deviceId: string;
  deletedAt?: string;
}

export type ThemePreference = 'light' | 'dark' | 'system';
export type DefaultView =
  | 'today'
  | 'week'
  | 'month'
  | 'kanban'
  | 'whiteboard'
  | 'calendar'
  | 'inbox';

export interface Settings {
  id: 'singleton';
  workdayStart: string;
  workdayEnd: string;
  weekStartsOn: 0 | 1;
  theme: ThemePreference;
  syncEnabled: boolean;
  defaultView: DefaultView;
  leftyMode: boolean;
  pomodoroFocusMinutes: number;
  pomodoroBreakMinutes: number;
  dailyReviewAt: string;
  updatedAt: string;
}

export interface SyncOp {
  id: ID;
  table: 'tasks' | 'projects' | 'whiteboards' | 'reminders';
  recordId: ID;
  op: 'put' | 'delete';
  payload: unknown;
  createdAt: string;
  attempts: number;
  lastError?: string;
}
