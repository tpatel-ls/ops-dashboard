'use client';

import { getDb, pickWinner } from '@drift/core';
import type { Project, SyncOp, Task, Whiteboard } from '@drift/core';
import { getSupabase, isSupabaseConfigured } from './supabase';

const TABLE_KEYS = ['tasks', 'projects', 'whiteboards'] as const;
type SyncableTable = (typeof TABLE_KEYS)[number];

let timer: number | null = null;
let running = false;

export function startSync(): void {
  if (timer !== null) return;
  if (typeof window === 'undefined') return;
  timer = window.setInterval(() => {
    void runOnce();
  }, 30_000);
  void runOnce();
}

export function stopSync(): void {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
}

export async function runOnce(): Promise<void> {
  if (running) return;
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return;

  running = true;
  try {
    const db = getDb();
    await pushQueue();
    await pullChanges();
    void db.transaction('rw', db.syncOps, async () => {
      const stale = await db.syncOps.where('attempts').above(10).toArray();
      for (const op of stale) await db.syncOps.delete(op.id);
    });
  } finally {
    running = false;
  }
}

async function pushQueue(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const db = getDb();
  const ops = await db.syncOps.orderBy('createdAt').limit(50).toArray();
  for (const op of ops) {
    if (!isSyncableTable(op.table)) {
      await db.syncOps.delete(op.id);
      continue;
    }
    try {
      const { error } = await supabase.from(op.table).upsert(op.payload as never);
      if (error) throw error;
      await db.syncOps.delete(op.id);
    } catch (e) {
      const next: SyncOp = {
        ...op,
        attempts: op.attempts + 1,
        lastError: (e as Error).message,
      };
      await db.syncOps.put(next);
      break;
    }
  }
}

async function pullChanges(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const cursorKey = 'drift.lastPulledAt';
  const since = window.localStorage.getItem(cursorKey) ?? '1970-01-01T00:00:00Z';
  const nowIso = new Date().toISOString();
  for (const table of TABLE_KEYS) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .gt('updatedAt', since)
      .limit(500);
    if (error || !data) continue;
    for (const remote of data) {
      const local = await getLocal(table, (remote as { id: string }).id);
      const winner = pickWinner(local, remote as Task | Project | Whiteboard);
      await putLocal(table, winner);
    }
  }
  window.localStorage.setItem(cursorKey, nowIso);
}

async function getLocal(table: SyncableTable, id: string) {
  const db = getDb();
  if (table === 'tasks') return db.tasks.get(id);
  if (table === 'projects') return db.projects.get(id);
  return db.whiteboards.get(id);
}

async function putLocal(table: SyncableTable, rec: Task | Project | Whiteboard) {
  const db = getDb();
  if (table === 'tasks') await db.tasks.put(rec as Task);
  else if (table === 'projects') await db.projects.put(rec as Project);
  else await db.whiteboards.put(rec as Whiteboard);
}

function isSyncableTable(t: string): t is SyncableTable {
  return (TABLE_KEYS as readonly string[]).includes(t);
}
