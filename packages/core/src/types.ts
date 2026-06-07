export type ID = string;

export type TaskStatus = 'backlog' | 'todo' | 'doing' | 'blocked' | 'done' | 'archived';
export type Priority = 0 | 1 | 2 | 3;

/** Shared metadata that makes a record locally-syncable. */
export interface SyncMeta {
  id: ID;
  createdAt: string;
  updatedAt: string;
  version: number;
  deviceId: string;
  deletedAt?: string;
}

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
  /** Minutes before the anchor time, when derived from a relative offset. */
  offsetMinutes?: number;
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
  /** Top-level life area. */
  domainId?: ID;
  /** Optional link to a content pipeline item. */
  contentId?: ID;
  /** Promoted into the Today "top three". */
  starred?: boolean;
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

export type ProjectKind = 'project' | 'area' | 'retainer';
export type ProjectStatus = 'active' | 'paused' | 'done' | 'archived';

export interface Milestone {
  id: ID;
  title: string;
  done: boolean;
  dueAt?: string;
}

export interface NamedChecklist {
  id: ID;
  name: string;
  items: ChecklistItem[];
}

export interface Project {
  id: ID;
  name: string;
  color: string;
  icon?: string;
  /** project = time-bound deliverable, area = ongoing space, retainer = monthly recurring. */
  kind: ProjectKind;
  status: ProjectStatus;
  domainId?: ID;
  description?: string;
  startDate?: string;
  dueDate?: string;
  /** Drives the Today "slipping" rail. */
  lastWorkedAt?: string;
  milestones: Milestone[];
  checklists: NamedChecklist[];
  /** For retainers: day of month (1-28) to auto-reload recurring items. */
  retainerResetDay?: number;
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

/** Top-level life area; everything (projects, tasks, routines) rolls up to a domain. */
export interface Domain extends SyncMeta {
  name: string;
  color: string;
  icon?: string;
  description?: string;
  order: number;
  archivedAt?: string;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';
export type RoutineKind = 'ongoing' | 'fixed';

/** A habit / routine the user checks off (daily). */
export interface Routine extends SyncMeta {
  name: string;
  description?: string;
  timeOfDay: TimeOfDay;
  /** 'HH:mm' optional specific time. */
  specificTime?: string;
  notify: boolean;
  domainId?: ID;
  kind: RoutineKind;
  /** For fixed streaks (e.g. a 30-day challenge). */
  durationDays?: number;
  startDate: string;
  endDate?: string;
  color?: string;
  order: number;
  archivedAt?: string;
}

/** A single day's completion record for a routine. */
export interface RoutineCheck extends SyncMeta {
  routineId: ID;
  /** Local YYYY-MM-DD. */
  date: string;
  done: boolean;
  completedAt?: string;
  source?: 'manual' | 'journal';
}

export type CaptureSource = 'text' | 'voice' | 'watch' | 'journal';
export type CaptureStatus = 'pending' | 'triaged' | 'dismissed';
export type CaptureKind = 'task' | 'note' | 'journal' | 'event' | 'person' | 'quote' | 'routine';

export interface CaptureRoute {
  type: CaptureKind;
  id: ID;
}

/** A raw, frictionless capture before (and after) AI triage routes it. */
export interface Capture extends SyncMeta {
  raw: string;
  source: CaptureSource;
  status: CaptureStatus;
  routedTo?: CaptureRoute;
  aiSummary?: string;
  aiKind?: CaptureKind;
}

export interface JournalEntry extends SyncMeta {
  /** Local YYYY-MM-DD. */
  date: string;
  title?: string;
  body: string;
  mediaUrls: string[];
  mood?: string;
  tags: string[];
  source?: 'voice' | 'text' | 'upload';
  flaggedForReview?: boolean;
}

/** Time tracking entry; also feeds the activity heatmap. */
export interface WorkLog extends SyncMeta {
  projectId: ID;
  minutes: number;
  note?: string;
  at: string;
}

export type ContentType = 'video' | 'article' | 'podcast' | 'newsletter';
export type ContentStatus =
  | 'idea'
  | 'outline'
  | 'draft'
  | 'editing'
  | 'waiting'
  | 'published'
  | 'done';

export interface Content extends SyncMeta {
  title: string;
  type: ContentType;
  status: ContentStatus;
  channel?: string;
  domainId?: ID;
  url?: string;
  outline?: string;
  publishDate?: string;
  checklist: ChecklistItem[];
  order: number;
}

export type NotificationKind = 'capture' | 'reminder' | 'summary' | 'review' | 'system';

export interface AppNotification extends SyncMeta {
  title: string;
  body?: string;
  kind: NotificationKind;
  refType?: string;
  refId?: ID;
  readAt?: string;
}

/** Reusable checklist (e.g. "new website") applied when creating projects/content. */
export interface ChecklistTemplate extends SyncMeta {
  name: string;
  kind?: string;
  items: string[];
}

export type ThemePreference = 'light' | 'dark' | 'system';
export type DefaultView =
  | 'today'
  | 'week'
  | 'month'
  | 'kanban'
  | 'whiteboard'
  | 'calendar'
  | 'inbox'
  | 'tasks'
  | 'routines'
  | 'habits'
  | 'projects'
  | 'content'
  | 'library'
  | 'people'
  | 'domains';

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
  /** IANA timezone; falls back to the device timezone when unset. */
  timezone?: string;
  /** Master switch for server AI features (triage, journal, chat). */
  aiEnabled: boolean;
  /** Jared's tweak: auto-attach a reminder to captured tasks unless told not to. */
  captureAutoReminder: boolean;
  /** Days a project/task can go untouched before it shows as "slipping". */
  slippingDays: number;
  updatedAt: string;
}

export type SyncTable =
  | 'tasks'
  | 'projects'
  | 'whiteboards'
  | 'reminders'
  | 'domains'
  | 'routines'
  | 'routineChecks'
  | 'captures'
  | 'journalEntries'
  | 'workLogs'
  | 'content'
  | 'notifications'
  | 'checklistTemplates';

export interface SyncOp {
  id: ID;
  table: SyncTable;
  recordId: ID;
  op: 'put' | 'delete';
  payload: unknown;
  createdAt: string;
  attempts: number;
  lastError?: string;
}
