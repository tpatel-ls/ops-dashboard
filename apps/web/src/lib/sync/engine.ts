'use client';

import { getDb } from '@ops-dashboard/core';
import type { Syncable } from '@ops-dashboard/core';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { setSyncStatus } from './status';
import {
  DEXIE_TABLES,
  SYNC_TABLES,
  fromRow,
  isSyncedTable,
  toRow,
  type DexieTableName,
} from './mapping';
import { createSyncCursorCache, overlappedCursor, SYNC_EPOCH } from './cursors';
import { shouldAcceptRemote } from './conflicts';
import { visitPullPages } from './pagination';
import { nextRecordedAttempt, outboundRecordPayload } from './outbox';
import { createSingleFlightQueue } from './single-flight';
import { readLocalStorage, writeLocalStorage } from '../browser-storage';

const CURSORS_KEY = 'ops.sync.cursors'; // JSON map: dbTable -> max updated_at pulled
const MAX_ATTEMPTS = 12;
const DRAIN_BATCH = 100;
const BACKFILL_CHUNK = 200;
const SAFETY_INTERVAL_MS = 20_000;
const KICK_DEBOUNCE_MS = 300;
// Re-query a small window behind each table's cursor so a row written by a
// slightly clock-behind device isn't permanently skipped. mergeInbound is
// idempotent, so the overlap is harmless.
const PULL_OVERLAP_MS = 120_000;
const PULL_PAGE_SIZE = 1_000;

// `generation` is bumped on every start/stop so an in-flight startSync that is
// superseded (user toggled off, signed out, restarted) bails before installing
// its realtime channel / listeners / timers.
let generation = 0;
let channel: RealtimeChannel | null = null;
let safetyTimer: number | null = null;
let kickTimer: number | null = null;
let draining = false;
let authSub: { unsubscribe: () => void } | null = null;
const cursorCache = createSyncCursorCache();

function db() {
  return getDb();
}

async function getLocalRow(table: DexieTableName, id: string): Promise<Syncable | undefined> {
  return (await db().table(table).get(id)) as Syncable | undefined;
}

async function putLocalRow(table: DexieTableName, rec: Syncable): Promise<void> {
  // Direct Dexie write - NOT through the mutation helpers - so inbound merges
  // never re-enqueue an outbound op (which would loop).
  await db().table(table).put(rec);
}

/** Apply a remote row locally only when it is strictly newer (skips echoes). */
async function mergeInbound(table: DexieTableName, row: Record<string, unknown>): Promise<void> {
  const rec = fromRow(row);
  if (!rec?.id) return;
  const local = await getLocalRow(table, rec.id);
  if (!shouldAcceptRemote(local, rec)) return;
  await putLocalRow(table, rec);
}

async function updatePending(): Promise<void> {
  const pending = await db().syncOps.count();
  setSyncStatus({ pending });
}

// ---- Push (outbox -> Supabase) --------------------------------------------

async function drainOutbox(supabase: SupabaseClient, userId: string): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    // A table that fails once this drain is skipped for the rest of the drain
    // (preserves per-table op ordering) WITHOUT blocking other tables. This
    // keeps e.g. a table whose prod migration is not applied yet from wedging
    // the whole outbox; its ops just retry next cycle.
    const failedTables = new Set<string>();
    let more = true;
    while (more) {
      const ops = await db().syncOps.orderBy('createdAt').limit(DRAIN_BATCH).toArray();
      if (!ops.length) break;
      more = ops.length === DRAIN_BATCH;
      let progressed = false;

      for (const op of ops) {
        if (!isSyncedTable(op.table)) {
          await db().syncOps.delete(op.id);
          progressed = true;
          continue;
        }
        if (failedTables.has(op.table)) continue;
        const dbTable = SYNC_TABLES[op.table];
        const payload = outboundRecordPayload(op.payload);
        if (!payload) {
          await db().syncOps.delete(op.id);
          progressed = true;
          continue;
        }
        const row = toRow(payload, userId);
        // Both 'put' and 'delete' upsert the record; a delete is a tombstone
        // (deletedAt set). The DB version-guard trigger prevents clobbering a
        // newer remote, so a stale push is a harmless no-op.
        const { error } = await supabase.from(dbTable).upsert(row);
        if (error) {
          const attempts = nextRecordedAttempt(op.attempts, MAX_ATTEMPTS);
          // Keep the operation queued until it succeeds. Dropping it after a
          // retry limit would silently strand the local change on this device.
          await db().syncOps.update(op.id, { attempts, lastError: error.message });
          // Back off on this table only; others keep draining this cycle.
          failedTables.add(op.table);
          continue;
        }
        await db().syncOps.delete(op.id);
        progressed = true;
      }

      // Head of the queue is entirely failed/skipped ops: stop so we do not
      // hot-loop re-reading the same batch; the next cycle retries them.
      if (!progressed) break;
    }
  } finally {
    draining = false;
    await updatePending();
  }
}

// ---- Pull (Supabase -> local) ---------------------------------------------

function readCursors(): Record<string, string> {
  return cursorCache.read(readLocalStorage(CURSORS_KEY));
}

function writeCursors(cursors: Record<string, string>): void {
  writeLocalStorage(CURSORS_KEY, cursorCache.store(cursors));
}

/**
 * Catch-up pull. Each table keeps its OWN cursor and only advances it on a
 * successful fetch of that table - a transient error on one table never moves
 * another table's cursor past unread rows.
 */
async function pull(supabase: SupabaseClient): Promise<void> {
  const cursors = readCursors();
  let changed = false;

  for (const table of DEXIE_TABLES) {
    const dbTable = SYNC_TABLES[table];
    const cursor = cursors[dbTable] ?? SYNC_EPOCH;
    const since = overlappedCursor(cursor, PULL_OVERLAP_MS);

    let maxSeen = cursor;
    const pulled = await visitPullPages(
      async ({ from, to }) => {
        const { data, error } = await supabase
          .from(dbTable)
          .select('*')
          .gte('updated_at', since)
          .order('updated_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);
        return error || !data ? null : (data as Array<Record<string, unknown>>);
      },
      async (row) => {
        await mergeInbound(table, row);
        const ts = row.updated_at;
        if (typeof ts === 'string' && ts > maxSeen) maxSeen = ts;
      },
      PULL_PAGE_SIZE,
    );
    if (!pulled) continue; // leave THIS table's cursor untouched so the full pull retries
    if (maxSeen !== cursor) {
      cursors[dbTable] = maxSeen;
      changed = true;
    }
  }

  if (changed) writeCursors(cursors);
}

// ---- Backfill (one-time full push of pre-existing local data) --------------

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function backfillIfNeeded(supabase: SupabaseClient, userId: string): Promise<void> {
  const key = `ops.sync.backfilled.${userId}`;
  if (readLocalStorage(key) === '1') return;

  for (const table of DEXIE_TABLES) {
    const rows = (await db().table(table).toArray()) as Array<Record<string, unknown>>;
    if (!rows.length) continue;
    for (const batch of chunk(rows, BACKFILL_CHUNK)) {
      const mapped = batch.map((r) => toRow(r, userId));
      const { error } = await supabase.from(SYNC_TABLES[table]).upsert(mapped);
      if (error) throw error; // leave the flag unset so we retry next start
    }
  }
  writeLocalStorage(key, '1');
}

// ---- Realtime --------------------------------------------------------------

function subscribeRealtime(supabase: SupabaseClient): void {
  if (channel) return; // never double-subscribe
  channel = supabase.channel('ops-sync');
  for (const table of DEXIE_TABLES) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: SYNC_TABLES[table] },
      (payload) => {
        const row = (payload.new ?? payload.old) as Record<string, unknown> | undefined;
        if (row && row.id) void mergeInbound(table, row);
      },
    );
  }
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') setSyncStatus({ state: 'live', error: null });
    else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')
      setSyncStatus({ state: 'error', error: 'realtime' });
    else if (status === 'CLOSED') setSyncStatus({ state: 'offline' });
  });
}

// ---- Lifecycle -------------------------------------------------------------

function ensureAuthListener(supabase: SupabaseClient): void {
  if (authSub) return;
  const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
    if (event === 'TOKEN_REFRESHED' && s) supabase.realtime.setAuth(s.access_token);
    if (event === 'SIGNED_IN') void restartSync();
    if (event === 'SIGNED_OUT') void stopSync();
  });
  authSub = sub.subscription;
}

function scheduleKick(): void {
  if (kickTimer !== null) return;
  kickTimer = window.setTimeout(() => {
    kickTimer = null;
    void cycle();
  }, KICK_DEBOUNCE_MS);
}

/** One push+pull pass using a fresh authenticated client. */
async function runCycle(): Promise<void> {
  const myGen = generation;
  const supabase = createClient();
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (myGen !== generation) return; // superseded by a stop/restart mid-cycle
  if (!session) {
    setSyncStatus({ state: 'signed-out' });
    return;
  }
  try {
    await drainOutbox(supabase, session.user.id);
    await pull(supabase);
    if (myGen !== generation) return;
    setSyncStatus({ state: 'live', error: null, lastSyncedAt: new Date().toISOString() });
  } catch {
    if (myGen !== generation) return;
    setSyncStatus({ state: navigator.onLine ? 'error' : 'offline' });
  }
}

const cycleQueue = createSingleFlightQueue(runCycle);

function cycle(): Promise<void> {
  return cycleQueue.run();
}

function onKickEvent(): void {
  scheduleKick();
}
function onOnline(): void {
  void cycle();
}

/** Tear down every installed resource. Idempotent. */
async function teardown(): Promise<void> {
  cycleQueue.clearPending();
  if (typeof window !== 'undefined') {
    window.removeEventListener('ops:sync-kick', onKickEvent);
    window.removeEventListener('online', onOnline);
  }
  if (safetyTimer !== null) {
    clearInterval(safetyTimer);
    safetyTimer = null;
  }
  if (kickTimer !== null) {
    clearTimeout(kickTimer);
    kickTimer = null;
  }
  if (channel) {
    try {
      await createClient()?.removeChannel(channel);
    } catch {
      /* ignore */
    }
    channel = null;
  }
  if (authSub) {
    authSub.unsubscribe();
    authSub = null;
  }
}

export async function startSync(): Promise<void> {
  if (typeof window === 'undefined') return;
  // Each call gets a fresh generation; a stop/restart bumps it and makes this
  // run bail before installing anything.
  const myGen = ++generation;
  await teardown();
  if (myGen !== generation) return;

  const supabase = createClient();
  if (!supabase) {
    setSyncStatus({ state: 'unconfigured' });
    return;
  }

  const { data } = await supabase.auth.getSession();
  if (myGen !== generation) return;
  const session = data.session;
  if (!session) {
    setSyncStatus({ state: 'signed-out' });
    ensureAuthListener(supabase); // restart when the user signs in later
    return;
  }

  setSyncStatus({ state: 'connecting', error: null });
  const userId = session.user.id;
  supabase.realtime.setAuth(session.access_token); // realtime authorization

  try {
    await backfillIfNeeded(supabase, userId);
    if (myGen !== generation) return;
    await pull(supabase);
    if (myGen !== generation) return;
    setSyncStatus({ lastSyncedAt: new Date().toISOString() });
  } catch {
    if (myGen !== generation) return;
    setSyncStatus({ state: navigator.onLine ? 'error' : 'offline' });
  }

  if (myGen !== generation) return; // a stop landed during startup - do not go live

  // Realtime's SUBSCRIBED callback drives the 'live' state from here.
  subscribeRealtime(supabase);
  void drainOutbox(supabase, userId).catch(() => {});
  await updatePending();
  ensureAuthListener(supabase);

  window.addEventListener('ops:sync-kick', onKickEvent);
  window.addEventListener('online', onOnline);
  safetyTimer = window.setInterval(() => void cycle(), SAFETY_INTERVAL_MS);
}

export async function stopSync(): Promise<void> {
  generation++; // invalidate any in-flight startSync
  await teardown();
  setSyncStatus({ state: 'off' });
}

async function restartSync(): Promise<void> {
  await stopSync();
  await startSync();
}
